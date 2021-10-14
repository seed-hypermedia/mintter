package lightning

import (
	"fmt"
	"sync"
	"time"

	"github.com/lightninglabs/loop/loopd"
	"github.com/lightningnetwork/lnd/build"
	"github.com/lightningnetwork/lnd/signal"
	"go.uber.org/zap"

	"mintter/backend/config"
)

type Loop struct {
	//autopilotrpc signrpc walletrpc chainrpc invoicesrpc routerrpc watchtowerrpc
	sync.Mutex
	cfg           *config.Loop
	log           *zap.Logger
	loopRunning   int32
	loopStopped   bool
	adminMacaroon []byte
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

// Run starts the loop daemon and blocks until it's shut down again.
func (l *Loop) Start(lndhost string, lndDir string) error {
	l.startTime = time.Now()
	l.Lock()
	if !l.loopStopped {
		l.Unlock()
		return fmt.Errorf("loop must be stopped first")
	}

	config := loopd.DefaultConfig()

	config.Lnd.Host = lndhost
	config.Lnd.MacaroonPath = lndDir + "/data/chain/bitcoin/" + l.cfg.Network + "/admin.macaroon"
	config.Lnd.TLSPath = lndDir + "/tls.cert"
	config.LoopDir = l.cfg.LoopDir
	config.Network = l.cfg.Network
	config.RPCListen = l.cfg.RawRPCListener

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
