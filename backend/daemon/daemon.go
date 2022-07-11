// Package daemon assembles everything to boot the mintterd program. It's like main, but made a separate package
// to be importable and testable by other packages, because package main can't be imported.
//
// We're using Uber's FX Dependency Injection framework here to simplify the setup, because during the development
// it was changing quite a bit, and managing everything manually was a bit of a pain.
// Some things in FX are not quite simple either, and we had to do a bunch of workarounds to make sure everything works properly
// and shuts down cleanly.
//
// Each file in here provides relevant FX providers and invokers, which are all assembled in an FX Module here (see Module() function).
//
// We might want to eventually get rid of FX and manage everything manually when things get a bit more stable.
//
// Most of the complexity here is due to the fact that we're doing lazy registration of the Mintter Account, i.e. we have to
// boot everything up even though the Mintter Account is not yet available until the registration happens in the frontend.
// Because of this we're using some future-/promise-like structures which resolve after the registration happens.
package daemon

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"

	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

// Daemon is the main mintterd daemon with all of its dependencies included.
// It's an fx.In so can be used with fx.Populate option, see makeTestDaemon()
// function in tests for an example.
type Daemon struct {
	fx.In

	Config config.Config
	GRPC   *grpcServer
	HTTP   *httpServer
	Net    *future.ReadOnly[*mttnet.Node]
	Repo   *ondisk.OnDisk
	Me     *future.ReadOnly[core.Identity]
	SQLite *sqlitex.Pool
	VCS    *vcs.SQLite
}

// Module is an FX module option with all the necessary providers and invokers.
// It needs an already populated Config which will be supplied to all the provider functions.
func Module(cfg config.Config) fx.Option {
	return fx.Options(
		fx.Supply(cfg),
		fx.Logger(&fxLogger{zap.NewNop().Sugar()}), // sometimes we may want to pass real zap logger here.
		fx.Provide(
			provideRepo,
			provideAccount,
			provideSQLite,
			provideVCS,
			provideNetwork,
			provideGRPCServer,
			provideHTTPServer,
		),
		fx.Invoke(
			registerGRPC,
			registerHTTP,
			logAppLifecycle,
		),
	)
}

// fxLogger is an implemented for a logger in FX that uses Zap instead of std logger.
// This way we control all the logging using Zap.
type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}

// logAppLifecycle is an FX invoker, which takes a populated Daemon and logs some lifecycle messages.
func logAppLifecycle(lc fx.Lifecycle, stop fx.Shutdowner, d Daemon) {
	log := logging.New("mintter/daemon", "debug")

	if d.Config.LetsEncrypt.Domain != "" {
		log.Warn("Let's Encrypt is enabled, HTTP-port configuration value is ignored, will listen on the default TLS port (443)")
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				<-d.GRPC.ready
				<-d.HTTP.ready
				log.Info("DaemonStarted",
					zap.String("grpcListener", d.GRPC.lis.Addr().String()),
					zap.String("httpListener", d.HTTP.lis.Addr().String()),
					zap.String("repoPath", d.Config.RepoPath),
				)
				logging.SetLogLevel("autorelay", "debug")
				net, err := d.Net.Await(context.Background())
				if err != nil {
					panic(err)
				}
				<-net.Ready()
				addrs, err := net.Libp2p().Network().InterfaceListenAddresses()
				if err != nil {
					log.Error("FailedToParseOwnAddrs", zap.Error(err))
					if err := stop.Shutdown(); err != nil {
						panic(err)
					}
					return
				}
				log.Info("P2PNodeStarted", zap.Any("listeners", addrs))
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			log.Info("GracefulShutdownStarted")
			log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")
			return nil
		},
	})
}
