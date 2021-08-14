package lightning

import (
	"context"
	"fmt"
	"reflect"
	"sync"
	"time"

	"github.com/jessevdk/go-flags"
	"github.com/lightningnetwork/lnd"
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

// API represents the lnnode exposed functions that are accessible for
// mintter services to use.
// It is mainly enable the service to subscribe to various daemon events
// and get an APIClient to query the daemon directly via RPC.
type API interface {
	SubscribeEvents() (*subscribe.Client, error)
	HasActiveChannel() bool
	IsReadyForPayment() bool
	WaitReadyForPayment(timeout time.Duration) error
	NodePubkey() string
	APIClient() lnrpc.LightningClient
	RouterClient() routerrpc.RouterClient
	WalletKitClient() walletrpc.WalletKitClient
	ChainNotifierClient() chainrpc.ChainNotifierClient
	InvoicesClient() invoicesrpc.InvoicesClient
	SignerClient() signrpc.SignerClient
}

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
func NewLdaemon(log *zap.Logger, cfg *config.LND, startBeforeSync bool) (*Ldaemon, error) {

	return &Ldaemon{
		cfg:        cfg,
		ntfnServer: subscribe.NewServer(),
		log:        log,
	}, nil
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

	writer, err := GetLogWriter(d.cfg)
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

func (d *Ldaemon) startDaemon() error {
	d.Lock()
	defer d.Unlock()
	if d.daemonRunning {
		return fmt.Errorf("Daemon already running")
	}

	// Hook interceptor for os signals.
	shutdownInterceptor, err := signal.Intercept()
	if err != nil {
		return fmt.Errorf("Problem getting interceptor" + err.Error())
	}

	d.interceptor = shutdownInterceptor

	d.quitChan = make(chan struct{})
	readyChan := make(chan interface{})

	d.wg.Add(2)
	go d.notifyWhenReady(readyChan)
	d.daemonRunning = true

	// Run the daemon
	go func() {
		defer func() {
			defer d.wg.Done()
			go d.stopDaemon()
		}()

		lndConfig, err := d.createConfig(d.cfg.LndDir)
		if err != nil {
			d.log.Error("Failed to create config", zap.String("err", err.Error()))
		}
		d.log.Info("Stating LND Daemon")
		err = lnd.Main(lndConfig, lnd.ListenerCfg{}, d.interceptor)
		if err != nil {
			d.log.Error("Main function returned with error", zap.String("err", err.Error()))
		}
		d.log.Info("LND Daemon Finished")

	}()
	return nil
}
