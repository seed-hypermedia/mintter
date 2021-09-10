package lightning

import (
	"fmt"
	"os"
	"reflect"
	"strings"
	"sync"
	"time"

	"github.com/jessevdk/go-flags"
	"github.com/lightningnetwork/lnd"
	"github.com/lightningnetwork/lnd/build"
	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/chainrpc"
	"github.com/lightningnetwork/lnd/lnrpc/invoicesrpc"
	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"github.com/lightningnetwork/lnd/lnrpc/signrpc"
	"github.com/lightningnetwork/lnd/lnrpc/walletrpc"
	"github.com/lightningnetwork/lnd/signal"
	"github.com/lightningnetwork/lnd/subscribe"
	"go.uber.org/zap"

	"mintter/backend/config"
)

const (
	alreadyExistsError    = "wallet already exists"
	alreadyUnlockedError  = "wallet already unlocked"
	waitSecondsPerAttempt = 3
	maxConnAttemps        = 20
)

var (
	initBackend sync.Once
	logWriter   *build.RotatingLogWriter
	initError   error
)

// Daemon contains data regarding the lightning daemon.
type Ldaemon struct {
	sync.Mutex
	cfg                 *config.LND
	log                 *zap.Logger
	startTime           time.Time
	daemonRunning       bool
	daemonStopped       bool
	nodeID              string
	adminMacaroon       []byte
	wg                  sync.WaitGroup
	interceptor         signal.Interceptor
	lightningClient     lnrpc.LightningClient
	unlockerClient      lnrpc.WalletUnlockerClient
	routerClient        routerrpc.RouterClient
	walletKitClient     walletrpc.WalletKitClient
	chainNotifierClient chainrpc.ChainNotifierClient
	invoicesClient      invoicesrpc.InvoicesClient
	signerClient        signrpc.SignerClient
	ntfnServer          *subscribe.Server
	quitChan            chan struct{}
}

// NewDaemon is used to create a new daemon that wraps a lightning
// network daemon.
func NewLdaemon(log *zap.Logger, cfg *config.LND) (*Ldaemon, error) {

	return &Ldaemon{
		cfg:           cfg,
		ntfnServer:    subscribe.NewServer(),
		log:           log,
		daemonStopped: true,
	}, nil
}

// Stop is used to stop the lightning network daemon. This function is blocking
// and waits until the lnd node is completely stoped. Typically a couple of seconds
func (d *Ldaemon) Stop() error {
	d.Lock()
	if !d.daemonRunning {
		d.Unlock()
		return fmt.Errorf("daemon already stopped")
	}
	d.Unlock()
	d.stopDaemon(nil)
	return nil
}

// Start is used to start the lightning network daemon.
// If NewPassword is different from "" and there exists an old wallet,
// then before unlocking the old wallet, the password is changed. The old
// password must be provided in the WalletSecurity struct. This function can be either
// blocking or non blocking based on the param flag. If blocking flag is set, the
// function does not return until either flnd is fully up and running, or a problem
// occurs or a 1 minute timeout elapses. If non blocking instead, the function returns
// inmediately but the user must wait for either the DaemonReadyEvent or the
// DaemonDownEvent  by subscribing to them
func (d *Ldaemon) Start(WalletSecurity *WalletSecurity, NewPassword string, blocking bool) error {
	d.startTime = time.Now()

	if err := d.ntfnServer.Start(); err != nil {
		return fmt.Errorf("failed to start ntfnServer: %v", err)
	}

	if _, err := d.startDaemon(WalletSecurity, NewPassword, blocking); err != nil {
		return fmt.Errorf("failed to start daemon: %v", err)
	}

	return nil
}

func (d *Ldaemon) stopDaemon(err error) {
	d.Lock()
	if !d.daemonRunning {
		d.Unlock()
		return
	}
	alive := d.interceptor.Alive()

	d.log.Info("Daemon.stop() called")
	if alive {
		d.interceptor.RequestShutdown()
	}
	close(d.quitChan)
	d.daemonRunning = false
	d.Unlock()

	d.wg.Wait()
	d.nodeID = ""

	d.Lock()
	d.daemonStopped = true
	d.ntfnServer.SendUpdate(DaemonDownEvent{err})
	d.log.Info("shutdown event sent")
	d.Unlock()
}

// Launches the LND main function in a separate goroutine and after that inits the wallet also in a separate
// goroutine. On success, it launches subsctription channels (for asynchronous notifications). If blocking flag
// is set, this function waits until LND is fully initialized or an error accurs or a 1 minute timeout.
// If blocking flag is unset, this function returns after validating configuration and the user should listen to
// the DaemonReadyEvent and DaemonDownEvent so it knows when its has been initialized or failed
func (d *Ldaemon) startDaemon(WalletSecurity *WalletSecurity,
	NewPassword string, blocking bool) (*lnd.Config, error) {

	d.Lock()
	if !d.daemonStopped {
		d.Unlock()
		return nil, fmt.Errorf("daemon must be stopped first")
	}
	d.daemonStopped = false
	d.daemonRunning = true
	d.Unlock()

	// Hook interceptor for os signals.
	shutdownInterceptor, err := signal.Intercept()
	if err != nil {
		return nil, fmt.Errorf("Problem getting interceptor" + err.Error())
	}

	d.interceptor = shutdownInterceptor
	d.quitChan = make(chan struct{})

	lndConfig, err := d.createConfig(d.cfg.LndDir)

	if err != nil {
		d.log.Error("Failed to create config", zap.String("err", err.Error()))
		return lndConfig, err
	} else {
		// Run the daemon
		d.wg.Add(1)
		go func() {
			defer d.wg.Done()

			d.log.Info("Starting LND Daemon")
			lndeEr := lnd.Main(lndConfig, lnd.ListenerCfg{}, d.interceptor)
			if err != nil {
				d.log.Error("Main function returned with error", zap.String("err", err.Error()))
			}
			d.log.Info("LND Daemon Finished")
			go d.stopDaemon(lndeEr)
		}()
	}

	var (
		macPath  = d.cfg.LndDir + "/" + defaultMacaroonFilename
		certPath = d.cfg.LndDir + "/" + defaultTLSCertFilename
	)

	// We start just the unlocker client because it is needed to init the wallet and it does not need the macaroon (since it has not been created yet)
	if grpcCon, err := newLightningClient(true, []byte(""), macPath, certPath, d.cfg.RawRPCListeners[0]); err != nil {
		go d.stopDaemon(err)
		return lndConfig, err
	} else {
		d.Lock()
		d.unlockerClient = lnrpc.NewWalletUnlockerClient(grpcCon)
		d.Unlock()
	}

	errChan := make(chan error)
	d.wg.Add(1)
	go func() {
		defer d.wg.Done()
		var i = 0
		var macaroon []byte
		var err error

		//We have to wait until LND spins up the unlocker server and we dont have the ready signal in ready channel inside lnd (like breez), so we wait in a backoff loop
	loop:
		for {
			time.Sleep(waitSecondsPerAttempt * time.Second)
			if macaroon, err = d.initWallet(WalletSecurity); err != nil {
				if strings.Contains(err.Error(), alreadyExistsError) {
					if len(NewPassword) != 0 {
						if macaroon, err = d.changeWalletPassPhrase(WalletSecurity.WalletPassphrase, NewPassword,
							WalletSecurity.StatelessInit); err != nil {
							d.log.Error("Could not change wallet password", zap.String("err", err.Error()))
							go d.stopDaemon(err)
						} else {
							WalletSecurity.WalletPassphrase = NewPassword
						}
						break loop
					}
					d.log.Info("Unlocking wallet since it was already created")
					err = d.unlockWallet(WalletSecurity.WalletPassphrase, WalletSecurity.StatelessInit)
					if err != nil && strings.Contains(err.Error(), alreadyUnlockedError) {
						err = nil
					}
				} else {
					select {
					case <-d.quitChan: // Early exit on shutdown
						break loop
					default:
						i++
						if i < maxConnAttemps {
							continue loop
						}
						d.log.Error("Could not init wallet", zap.String("err", err.Error()))
						go d.stopDaemon(err)
						break loop
					}

				}

			}
			if err == nil {
				if macaroon == nil { // in case we are unlocking instead of init
					d.Lock()
					macaroon = d.adminMacaroon
					d.Unlock()
				}

				if err = d.startRpcClients(macaroon); err != nil {
					d.log.Error("Can't start rpc clients, shutting down",
						zap.String("err", err.Error()))
					go d.stopDaemon(err)
				} else if err = d.startSubscriptions(); err != nil {
					d.log.Error("Can't start daemon subscriptions, shutting down",
						zap.String("err", err.Error()))
					go d.stopDaemon(err)
				}
				break loop
			}
		}
		d.Lock()
		d.adminMacaroon = macaroon
		d.Unlock()
		if blocking {
			select {
			case errChan <- err:
			case <-d.quitChan: //If nobody were listening to errChan, the above line would block if it weren't by this case
				errChan <- err
			}
		}

	}()

	if blocking {
		select {
		case err = <-errChan:
		case <-d.quitChan:
			err = <-errChan
			if err != nil {
				d.log.Error("Quitting while waiting in a blocking start",
					zap.String("err", err.Error()))
			}
		}

	}
	return lndConfig, err
}

// This adds minnter specific conf to the default LND config. The former takes precedence in case of conflicts.
func (d *Ldaemon) createConfig(workingDir string) (*lnd.Config, error) {

	lndConfig := lnd.DefaultConfig()
	lndConfig.Bitcoin.Active = true
	var f reflect.StructField
	var found bool
	typ := reflect.TypeOf(d.cfg)

	if d.cfg.Network == "mainnet" {
		lndConfig.Bitcoin.MainNet = true
	} else if d.cfg.Network == "regtest" {
		lndConfig.Bitcoin.RegTest = true
	} else {
		lndConfig.Bitcoin.TestNet3 = true
	}
	d.log.Info("LnNode, selected network:", zap.String("Network", d.cfg.Network))

	if d.cfg.Alias == "" {
		f, found = typ.Elem().FieldByName("Alias")
		if !found {
			return nil, fmt.Errorf("failed to get default value of config var Alias")
		} else {
			lndConfig.Alias = f.Tag.Get("default")
		}

	} else {
		lndConfig.Alias = d.cfg.Alias
	}

	if d.cfg.Color == "" {
		f, found = typ.Elem().FieldByName("Color")
		if !found {
			return nil, fmt.Errorf("failed to get default value of config var Color")
		} else {
			lndConfig.Color = f.Tag.Get("default")
		}

	} else {
		lndConfig.Color = d.cfg.Color
	}

	if len(d.cfg.RawListeners) == 0 {
		f, found = typ.Elem().FieldByName("RawListeners")
		if !found {
			return nil, fmt.Errorf("failed to get default value of config var RawListeners")
		} else {
			lndConfig.RawListeners = append(lndConfig.RawListeners, f.Tag.Get("default"))
			d.cfg.RawListeners = append(d.cfg.RawListeners, f.Tag.Get("default"))
		}

	} else {
		lndConfig.RawListeners = d.cfg.RawListeners
	}

	if len(d.cfg.RawRPCListeners) == 0 {
		f, found = typ.Elem().FieldByName("RawRPCListeners")
		if !found {
			return nil, fmt.Errorf("failed to get default value of config var RawRPCListeners")
		} else {
			lndConfig.RawRPCListeners = append(lndConfig.RawRPCListeners, f.Tag.Get("default"))
			d.cfg.RawRPCListeners = append(d.cfg.RawRPCListeners, f.Tag.Get("default"))
		}

	} else {
		lndConfig.RawRPCListeners = d.cfg.RawRPCListeners
	}

	if d.cfg.UseNeutrino {
		lndConfig.Bitcoin.Node = "neutrino"
		d.log.Info("neutrio backed selected")
	} else {
		lndConfig.Bitcoin.Node = "bitcoind"

		if d.cfg.BitcoindRPCHost == "" {
			f, found = typ.Elem().FieldByName("BitcoindRPCHost")
			if !found {
				return nil, fmt.Errorf("failed to get default value of config var BitcoindRPCHost")
			} else {
				lndConfig.BitcoindMode.RPCHost = f.Tag.Get("default")
				d.cfg.BitcoindRPCHost = f.Tag.Get("default")
			}

		} else {
			lndConfig.BitcoindMode.RPCHost = d.cfg.BitcoindRPCHost
		}

		if d.cfg.BitcoindRPCPass == "" {
			f, found = typ.Elem().FieldByName("BitcoindRPCPass")
			if !found {
				return nil, fmt.Errorf("failed to get default value of config var BitcoindRPCPass")
			} else {
				lndConfig.BitcoindMode.RPCPass = f.Tag.Get("default")
				d.cfg.BitcoindRPCPass = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.RPCPass = d.cfg.BitcoindRPCPass
		}

		if d.cfg.BitcoindRPCUser == "" {
			f, found = typ.Elem().FieldByName("BitcoindRPCUser")
			if !found {
				return nil, fmt.Errorf("failed to get default value of config var BitcoindRPCUser")
			} else {
				lndConfig.BitcoindMode.RPCUser = f.Tag.Get("default")
				d.cfg.BitcoindRPCUser = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.RPCUser = d.cfg.BitcoindRPCUser
		}

		if d.cfg.Zmqpubrawblock == "" {
			f, found = typ.Elem().FieldByName("Zmqpubrawblock")
			if !found {
				return nil, fmt.Errorf("failed to get default value of config var Zmqpubrawblock")
			} else {
				lndConfig.BitcoindMode.ZMQPubRawBlock = f.Tag.Get("default")
				d.cfg.Zmqpubrawblock = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.ZMQPubRawBlock = d.cfg.Zmqpubrawblock
		}

		if d.cfg.Zmqpubrawtx == "" {
			f, found = typ.Elem().FieldByName("Zmqpubrawtx")
			if !found {
				return nil, fmt.Errorf("failed to get default value of config var Zmqpubrawtx")
			} else {
				lndConfig.BitcoindMode.ZMQPubRawTx = f.Tag.Get("default")
				d.cfg.Zmqpubrawtx = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.ZMQPubRawTx = d.cfg.Zmqpubrawtx
		}
		d.log.Info("bitcoind backed selected", zap.String("BitcoindRPCHost",
			lndConfig.BitcoindMode.RPCHost), zap.String("BitcoindRPCUser",
			lndConfig.BitcoindMode.RPCUser))
	}

	lndConfig.LndDir = d.cfg.LndDir
	if d.cfg.DebugLevel != "" {
		lndConfig.DebugLevel = d.cfg.DebugLevel
	}

	lndConfig.DisableListen = d.cfg.DisableListen
	lndConfig.DisableRest = d.cfg.DisableRest
	lndConfig.ExternalHosts = d.cfg.ExternalHosts
	lndConfig.RawExternalIPs = d.cfg.RawExternalIPs
	lndConfig.NAT = d.cfg.NAT
	lndConfig.NoNetBootstrap = d.cfg.NoNetBootstrap
	lndConfig.Autopilot.Active = d.cfg.Autopilot
	cfg := lndConfig

	//FIXME: This should not be necessary but otherwise, cfg.ProtocolOptions would not be filled
	if err := flags.IniParse("", &cfg); err != nil && !os.IsNotExist(err) {
		d.log.Error("Failed to parse config", zap.String("err", err.Error()))
		return nil, err
	}

	writer, err := getLogWriter(d.cfg.LndDir + "/data/chain/bitcoin/" + d.cfg.Network)
	if err != nil {
		d.log.Error("getLogWriter function returned with error", zap.String("err", err.Error()))
		return nil, err
	}
	cfg.LogWriter = writer
	cfg.MinBackoff = time.Second * 20

	conf, err := lnd.ValidateConfig(cfg, "", d.interceptor)
	if err != nil {
		d.log.Error("Failed to parse config", zap.String("err", err.Error()))
		return nil, err
	}
	return conf, nil
}

func getLogWriter(workingDir string) (*build.RotatingLogWriter, error) {
	initBackend.Do(func() {
		buildLogWriter := build.NewRotatingLogWriter()

		filename := workingDir + "/lnd.log"
		err := buildLogWriter.InitLogRotator(filename, 10, 3)
		if err != nil {
			initError = err
			return
		}
		logWriter = buildLogWriter
	})
	return logWriter, initError
}
