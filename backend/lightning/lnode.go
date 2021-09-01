package lightning

import (
	"context"
	"fmt"
	"reflect"
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
	alreadyExistsError = "wallet already exists"
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
// password must be provided in the WalletSecurity struct.
func (d *Ldaemon) Start(WalletSecurity *WalletSecurity, NewPassword string) error {
	if atomic.SwapInt32(&d.started, 1) == 1 {
		return fmt.Errorf("Daemon already started")
	}
	d.startTime = time.Now()

	if err := d.ntfnServer.Start(); err != nil {
		return fmt.Errorf("Failed to start ntfnServer: %v", err)
	}

	if err := checkMacaroons(d.cfg); err != nil {
		d.log.Error("Something went wrong checking macaroons",
			zap.String("err", err.Error()))
		return err
	}

	if _, _, err := d.startDaemon(WalletSecurity, NewPassword); err != nil {
		return fmt.Errorf("Failed to start daemon: %v", err)
	}

	return nil
}

// Restart is used to restart a daemon that from some reason failed to start
// or was started and failed at some later point.
func (d *Ldaemon) Restart(WalletSecurity *WalletSecurity, NewPassword string) error {
	if atomic.LoadInt32(&d.started) == 0 {
		return fmt.Errorf("Daemon must be started before attempt to restart")
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
	d.ntfnServer.SendUpdate(DaemonDownEvent{})
	d.log.Info("Daemon sent down event")
}

func (d *Ldaemon) notifyWhenReady(readyChan chan interface{}) {
	defer d.wg.Done()
	select {
	case <-readyChan:
		if err := d.startSubscriptions(); err != nil {
			d.log.Error("Can't start daemon subscriptions, shutting down",
				zap.String("err", err.Error()))
			go d.stopDaemon()
		}
	case <-d.quitChan:
	}
}

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

func (d *Ldaemon) createConfig(workingDir string) (*lnd.Config, error) {

	lndConfig := lnd.DefaultConfig()
	lndConfig.Bitcoin.Active = true
	if d.cfg.Network == "mainnet" {
		lndConfig.Bitcoin.MainNet = true
	} else if d.cfg.Network == "testnet" {
		lndConfig.Bitcoin.TestNet3 = true
	} else {
		lndConfig.Bitcoin.RegTest = true
	}
	d.log.Info("LnNode, selected network:", zap.String("Network", d.cfg.Network))

	if d.cfg.UseNeutrino {
		lndConfig.Bitcoin.Node = "neutrino"
		d.log.Info("neutrio backed selected")
	} else {
		lndConfig.Bitcoin.Node = "bitcoind"
		typ := reflect.TypeOf(d.cfg)
		var f reflect.StructField
		var found bool
		if d.cfg.BitcoindRPCHost == "" {
			f, found = typ.FieldByName("BitcoindRPCHost")
			if !found {
				return nil, fmt.Errorf("Failed to get default value of config var BitcoindRPCHost")
			} else {
				lndConfig.BitcoindMode.RPCHost = f.Tag.Get("default")
			}

		} else {
			lndConfig.BitcoindMode.RPCHost = d.cfg.BitcoindRPCHost
		}

		if d.cfg.BitcoindRPCPass == "" {
			f, found = typ.FieldByName("BitcoindRPCPass")
			if !found {
				return nil, fmt.Errorf("Failed to get default value of config var BitcoindRPCPass")
			} else {
				lndConfig.BitcoindMode.RPCPass = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.RPCPass = d.cfg.BitcoindRPCPass
		}

		if d.cfg.BitcoindRPCUser == "" {
			f, found = typ.FieldByName("BitcoindRPCUser")
			if !found {
				return nil, fmt.Errorf("Failed to get default value of config var BitcoindRPCUser")
			} else {
				lndConfig.BitcoindMode.RPCUser = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.RPCUser = d.cfg.BitcoindRPCUser
		}

		if d.cfg.Zmqpubrawblock == "" {
			f, found = typ.FieldByName("Zmqpubrawblock")
			if !found {
				return nil, fmt.Errorf("Failed to get default value of config var Zmqpubrawblock")
			} else {
				lndConfig.BitcoindMode.ZMQPubRawBlock = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.ZMQPubRawBlock = d.cfg.Zmqpubrawblock
		}

		if d.cfg.Zmqpubrawtx == "" {
			f, found = typ.FieldByName("Zmqpubrawtx")
			if !found {
				return nil, fmt.Errorf("Failed to get default value of config var Zmqpubrawtx")
			} else {
				lndConfig.BitcoindMode.ZMQPubRawTx = f.Tag.Get("default")
			}
		} else {
			lndConfig.BitcoindMode.ZMQPubRawTx = d.cfg.Zmqpubrawtx
		}
		d.log.Info("bitcoind backed selected", zap.String("BitcoindRPCHost",
			lndConfig.BitcoindMode.RPCHost), zap.String("BitcoindRPCUser",
			lndConfig.BitcoindMode.RPCUser))
	}

	lndConfig.LndDir = d.cfg.LndDir
	lndConfig.Alias = d.cfg.Alias
	lndConfig.Color = d.cfg.Color
	lndConfig.DebugLevel = d.cfg.DebugLevel
	lndConfig.DisableListen = d.cfg.DisableListen
	lndConfig.DisableRest = d.cfg.DisableRest
	lndConfig.ExternalHosts = d.cfg.ExternalHosts
	lndConfig.RawExternalIPs = d.cfg.RawExternalIPs
	lndConfig.RawListeners = d.cfg.RawListeners
	lndConfig.RawRPCListeners = d.cfg.RawRPCListeners
	lndConfig.NAT = d.cfg.NAT
	lndConfig.NoNetBootstrap = d.cfg.NoNetBootstrap

	cfg := lndConfig
	if err := flags.IniParse(lndConfig.ConfigFile, &cfg); err != nil {
		d.log.Error("Failed to parse config", zap.String("err", err.Error()))
		return nil, err
	}

	writer, err := GetLogWriter(d.cfg.LndDir + "/bitcoin/" + d.cfg.Network)
	if err != nil {
		d.log.Error("GetLogWriter function returned with error", zap.String("err", err.Error()))
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

func (d *Ldaemon) startDaemon(WalletSecurity *WalletSecurity,
	NewPassword string) (*lnd.Config, []byte, error) {
	d.Lock()
	defer d.Unlock()
	if d.daemonRunning {
		return nil, nil, fmt.Errorf("Daemon already running")
	}

	// Hook interceptor for os signals.
	shutdownInterceptor, err := signal.Intercept()
	if err != nil {
		return nil, nil, fmt.Errorf("Problem getting interceptor" + err.Error())
	}

	d.interceptor = shutdownInterceptor

	d.quitChan = make(chan struct{})
	readyChan := make(chan interface{})

	d.wg.Add(1)
	d.daemonRunning = true
	config_chan := make(chan *lnd.Config, 1)
	// Run the daemon
	go func() {
		defer func() {
			defer d.wg.Done()
			go d.stopDaemon()
		}()

		lndConfig, err := d.createConfig(d.cfg.LndDir)
		config_chan <- lndConfig
		close(config_chan)
		if err != nil {
			d.log.Error("Failed to create config", zap.String("err", err.Error()))
		} else {
			d.log.Info("Stating LND Daemon")
			err = lnd.Main(lndConfig, lnd.ListenerCfg{}, d.interceptor)
			if err != nil {
				d.log.Error("Main function returned with error", zap.String("err", err.Error()))
			}
			d.log.Info("LND Daemon Finished")
		}
	}()

	lnd_config := <-config_chan

	d.wg.Add(1)

	go d.notifyWhenReady(readyChan)

	if macaroon, err := d.initWallet(WalletSecurity); err != nil {
		if err.Error() == alreadyExistsError {
			if len(NewPassword) != 0 {
				if macaroon, err = d.changeWalletPassPhrase(WalletSecurity.WalletPassphrase, NewPassword,
					WalletSecurity.StatelessInit); err != nil {
					d.log.Error("Could not change wallet password before unlock", zap.String("err", err.Error()))
					return lnd_config, macaroon, err
				} else {
					WalletSecurity.WalletPassphrase = NewPassword
				}

			}
			return lnd_config, macaroon, d.unlockWallet(WalletSecurity.WalletPassphrase,
				WalletSecurity.StatelessInit)
		} else {
			d.log.Error("Could not init wallet", zap.String("err", err.Error()))
			return lnd_config, macaroon, err
		}

	} else {
		return lnd_config, macaroon, err
	}

}

func GetLogWriter(workingDir string) (*build.RotatingLogWriter, error) {
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

func initLog(workingDir string) {

}
