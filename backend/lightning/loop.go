package lightning

import (
	"context"
	"fmt"
	"reflect"
	"sync"
	"time"

	"github.com/lightninglabs/loop/loopd"
	"github.com/lightninglabs/loop/looprpc"
	"github.com/lightningnetwork/lnd/build"
	"github.com/lightningnetwork/lnd/signal"

	"go.uber.org/zap"

	"mintter/backend/config"
)

const (
	loopMacaroonFilename = "loop.macaroon"
)

type Loop struct {
	sync.Mutex
	cfg           *config.Loop
	log           *zap.Logger
	loopRunning   int32
	loopStopped   bool
	adminMacaroon []byte
	swapClient    looprpc.SwapClientClient
	swapServer    looprpc.SwapServerClient
	debugClient   looprpc.DebugClient
	interceptor   *signal.Interceptor
	wg            sync.WaitGroup
	quitChan      chan struct{}
	startTime     time.Time
}

func NewLoop(log *zap.Logger, cfg *config.Loop, interceptor *signal.Interceptor) *Loop {

	return &Loop{
		cfg:         cfg,
		log:         log,
		loopStopped: true,
		loopRunning: 0,
		interceptor: interceptor,
	}
}

// Starts the loop daemon. It needs the address of the lnd node
// we want to loop in/out to/from. And the base path for the
// node directory.
func (l *Loop) Start(lndhost string, lndDir string) error {
	l.startTime = time.Now()
	l.Lock()
	if !l.loopStopped {
		l.Unlock()
		return fmt.Errorf("loop must be stopped first")
	}
	l.Unlock()

	config := loopd.DefaultConfig()

	var f reflect.StructField
	var found bool
	typ := reflect.TypeOf(l.cfg)

	if len(l.cfg.RawRPCListener) == 0 {
		f, found = typ.Elem().FieldByName("RawRPCListener")
		if !found {
			return fmt.Errorf("failed to get default value of config var RawRPCListener")
		} else {
			config.RPCListen = f.Tag.Get("default")
			l.cfg.RawRPCListener = f.Tag.Get("default")
		}

	} else {
		config.RPCListen = l.cfg.RawRPCListener
	}

	if l.cfg.Network == "regtest" && len(l.cfg.ServerAddres) != 0 {
		config.Server.Host = l.cfg.ServerAddres
	} else {
		f, found = typ.Elem().FieldByName("ServerAddres")
		if !found {
			return fmt.Errorf("failed to get default value of config var ServerAddres")
		} else {
			config.Server.Host = f.Tag.Get("default")
			l.cfg.ServerAddres = f.Tag.Get("default")
		}
	}

	config.Server.NoTLS = l.cfg.NoTLS
	config.Lnd.Host = lndhost
	config.Lnd.MacaroonPath = lndDir + "/data/chain/bitcoin/" + l.cfg.Network + "/admin.macaroon"
	config.Lnd.TLSPath = lndDir + "/tls.cert"
	config.LoopDir = l.cfg.LoopDir
	config.Network = l.cfg.Network
	if err := loopd.Validate(&config); err != nil {
		return err
	}

	// Initialize logging at the default logging level.
	logWriter, err := getLogWriter(l.cfg.LoopDir + "/data/chain/bitcoin/" + l.cfg.Network)
	if err != nil {
		l.log.Error("getLogWriter function returned with error", zap.String("err", err.Error()))
		return err
	}

	loopd.SetupLoggers(logWriter, *l.interceptor)

	err = build.ParseAndSetDebugLevels(config.DebugLevel, logWriter)
	if err != nil {
		return err
	}

	daemon := loopd.New(&config, loopd.NewListenerCfg(&config, loopd.RPCConfig{}))
	if err := daemon.Start(); err != nil {
		return err
	}

	if err := l.startRpcClient([]byte{}); err != nil {
		return err
	}
	if terms, err := l.GetTerms(); err != nil {
		return err
	} else {
		l.log.Info("Terms", zap.String("InOut", terms))
	}

	return nil
	//TODO: see if we can live without the below
	select {
	case <-l.interceptor.ShutdownChannel():
		l.log.Info("Received SIGINT (Ctrl+C).")
		daemon.Stop()

		// The above stop will return immediately. But we'll be
		// notified on the error channel once the process is
		// complete.
		return <-daemon.ErrChan

	case err := <-daemon.ErrChan:
		return err
	}

}

func (l *Loop) startRpcClient(macBytes []byte) error {
	var err error

	// in case this is a restart, macaroons are already stored in daemon and wallet already exists
	if len(macBytes) == 0 && len(l.adminMacaroon) != 0 {
		l.Lock()
		macBytes = l.adminMacaroon
		l.Unlock()
	}

	grpcCon, err := NewgRpcClient(false, macBytes, l.cfg.LoopDir+"/"+l.cfg.Network+
		"/"+loopMacaroonFilename, l.cfg.LoopDir+"/"+l.cfg.Network+"/"+
		defaultTLSCertFilename, l.cfg.RawRPCListener)
	if err != nil {
		return err
	}

	l.Lock()
	defer l.Unlock()
	l.swapClient = looprpc.NewSwapClientClient(grpcCon)
	l.swapServer = looprpc.NewSwapServerClient(grpcCon)
	l.debugClient = looprpc.NewDebugClient(grpcCon)

	return nil
}

func (l *Loop) SwapClient() looprpc.SwapClientClient {
	l.Lock()
	defer l.Unlock()
	return l.swapClient
}

func (l *Loop) SwapServer() looprpc.SwapServerClient {
	l.Lock()
	defer l.Unlock()
	return l.swapServer
}

func (l *Loop) DebugClient() looprpc.DebugClient {
	l.Lock()
	defer l.Unlock()
	return l.debugClient
}

func (l *Loop) GetTerms() (string, error) {
	loopclient := l.SwapClient()
	if loopclient == nil {
		return "", fmt.Errorf("Loop client not available")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if out_terms, err := loopclient.LoopOutTerms(ctx, &looprpc.TermsRequest{}); err != nil {
		l.log.Error("error getting terms", zap.String("err", err.Error()))
		return "", err
	} else if in_terms, err := loopclient.GetLoopInTerms(ctx, &looprpc.TermsRequest{}); err != nil {
		l.log.Error("error getting terms", zap.String("err", err.Error()))
		return "", err
	} else {
		return "In: " + in_terms.String() + " Out: " + out_terms.String(), nil
	}
}
