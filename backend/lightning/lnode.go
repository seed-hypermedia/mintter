package lightning

import (
	"context"
	"fmt"
	"os"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
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
	waitSecondsPerAttempt = 4
	maxConnAttemps        = 10
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
	started             int32
	stopped             int32
	startTime           time.Time
	daemonRunning       bool
	nodePubkey          string
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
		cfg:        cfg,
		ntfnServer: subscribe.NewServer(),
		log:        log,
	}, nil
}

// Stop is used to stop the lightning network daemon.
func (d *Ldaemon) Stop() error {
	if atomic.SwapInt32(&d.stopped, 1) == 0 {
		d.stopDaemon()
		d.ntfnServer.Stop()
	}
	d.wg.Wait()
	d.log.Info("Daemon shutdown successfully")
	return nil
}

// Start is used to start the lightning network daemon.
// If NewPassword is different from "" and there exists an old wallet,
// then before unlocking the old wallet, the password is changed. The old
// password must be provided in the WalletSecurity struct. This function is non
// blocking altough it may take several seconds to return. To check if the daemon
// is completely up, the user must wait for the DaemonReadyEvent by subscribing to it
func (d *Ldaemon) Start(WalletSecurity *WalletSecurity, NewPassword string) error {
	if atomic.SwapInt32(&d.started, 1) == 1 {
		return fmt.Errorf("daemon already started")
	}
	d.startTime = time.Now()

	if err := d.ntfnServer.Start(); err != nil {
		return fmt.Errorf("failed to start ntfnServer: %v", err)
	}

	if _, _, err := d.startDaemon(WalletSecurity, NewPassword); err != nil {
		return fmt.Errorf("failed to start daemon: %v", err)
	}

	return nil
}

// Restart is used to restart a daemon that from some reason failed to start
// or was started and failed at some later point.
func (d *Ldaemon) Restart(WalletSecurity *WalletSecurity, NewPassword string) error {
	if atomic.LoadInt32(&d.started) == 0 {
		return fmt.Errorf("daemon must be started before attempt to restart")
	}
	_, _, err := d.startDaemon(WalletSecurity, NewPassword)
	return err
}

func (d *Ldaemon) stopDaemon() {
	d.Lock()
	defer d.Unlock()
	if !d.daemonRunning {
		return
	}
	alive := d.interceptor.Alive()

	d.log.Info("Daemon.stop() called")
	if alive {
		d.interceptor.RequestShutdown()
	}
	close(d.quitChan)

	d.wg.Wait()
	d.daemonRunning = false
	d.nodePubkey = ""
	d.ntfnServer.SendUpdate(DaemonDownEvent{})
	d.log.Info("Daemon sent down event")
}

// Whether or not all the channels of the node are in active state. Not active means the counterparty is offline
// or it is in the process of being closed.
func (d *Ldaemon) allChannelsActive(client lnrpc.LightningClient) (bool, error) {
	channels, err := client.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		d.log.Error("Error in allChannelsActive() > ListChannels()",
			zap.String("err", err.Error()))
		return false, err
	}
	for _, c := range channels.Channels {
		if !c.Active {
			return false, nil
		}
	}
	return true, nil
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

// Launches the LND main function in a separate thread and after that inits the wallet. On success, it launches
// subsctription channels (for asynchronous notifications) and returns without blocking. This means the user cannot
// use the daemon until it either receives the DaemonReadyEvent or nodePubkey is filled
func (d *Ldaemon) startDaemon(WalletSecurity *WalletSecurity,
	NewPassword string) (*lnd.Config, []byte, error) {

	if d.daemonRunning {
		return nil, nil, fmt.Errorf("daemon already running")
	}

	// Hook interceptor for os signals.
	shutdownInterceptor, err := signal.Intercept()
	if err != nil {
		return nil, nil, fmt.Errorf("Problem getting interceptor" + err.Error())
	}

	d.interceptor = shutdownInterceptor

	d.quitChan = make(chan struct{})

	d.daemonRunning = true
	config_chan := make(chan *lnd.Config, 1)
	err_chan := make(chan error, 1)

	// Run the daemon
	d.wg.Add(1)
	go func() {
		defer func() {
			defer d.wg.Done()
			go d.stopDaemon()
		}()

		lndConfig, err := d.createConfig(d.cfg.LndDir)
		err_chan <- err
		config_chan <- lndConfig
		close(err_chan)
		close(config_chan)
		if err != nil {
			d.log.Error("Failed to create config", zap.String("err", err.Error()))
		} else {
			d.log.Info("Starting LND Daemon")
			err = lnd.Main(lndConfig, lnd.ListenerCfg{}, d.interceptor)
			if err != nil {
				d.log.Error("Main function returned with error", zap.String("err", err.Error()))
			}
			d.log.Info("LND Daemon Finished")
		}
	}()

	lnd_config := <-config_chan
	if err_config := <-err_chan; err_config != nil {
		go d.stopDaemon()
		return lnd_config, nil, err
	}

	var (
		macPath  = d.cfg.LndDir + "/" + defaultMacaroonFilename
		certPath = d.cfg.LndDir + "/" + defaultTLSCertFilename
	)

	// We start just the unlocker client because it is needed to init the wallet and it does not need the macaroon (since it has not been created yet)
	if grpcCon, err := newLightningClient(true, []byte(""), macPath, certPath, d.cfg.RawRPCListeners[0]); err != nil {
		go d.stopDaemon()
		return lnd_config, nil, err
	} else {
		d.Lock()
		d.unlockerClient = lnrpc.NewWalletUnlockerClient(grpcCon)
		d.Unlock()
	}

	//We need time for LND to spin up unlocker server and we dont have the ready signal in ready channel inside lnd(like breez)
	var i = 0
	for {
		time.Sleep(waitSecondsPerAttempt * time.Second)
		if macaroon, err := d.initWallet(WalletSecurity); err != nil {
			if strings.Contains(err.Error(), alreadyExistsError) {
				if len(NewPassword) != 0 {
					if macaroon, err = d.changeWalletPassPhrase(WalletSecurity.WalletPassphrase, NewPassword,
						WalletSecurity.StatelessInit); err != nil {
						d.log.Error("Could not change wallet password before unlock", zap.String("err", err.Error()))
						go d.stopDaemon()
						return lnd_config, macaroon, err
					} else {
						WalletSecurity.WalletPassphrase = NewPassword
					}

				}
				d.log.Info("Unlocking wallet since it was already created")
				return lnd_config, macaroon, d.unlockWallet(WalletSecurity.WalletPassphrase,
					WalletSecurity.StatelessInit)
			} else {
				i++
				if i < maxConnAttemps {
					continue
				}
				d.log.Error("Could not init wallet", zap.String("err", err.Error()))
				go d.stopDaemon()
				return lnd_config, macaroon, err
			}

		} else {
			var err error
			if err = d.startRpcClients(macaroon); err != nil {
				d.log.Error("Can't start rpc clients, shutting down",
					zap.String("err", err.Error()))
				go d.stopDaemon()
			} else if err = d.startSubscriptions(); err != nil {
				d.log.Error("Can't start daemon subscriptions, shutting down",
					zap.String("err", err.Error()))
				go d.stopDaemon()
			}
			return lnd_config, macaroon, err
		}
	}

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
