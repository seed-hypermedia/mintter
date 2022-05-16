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

// func Boot(cfg config.Config) (d *Daemon, err error) {
// 	d.Config = cfg

// 	// In case of error during boot, we want to cleanly close the things
// 	// that were already started. This is optional, but me (@burdiyan) is a graceful shutdown nerd ;)
// 	defer func() {
// 		if err != nil {
// 			err = multierr.Append(err, d.clean.Close())
// 		}
// 	}()

// 	d.Repo, err = provideRepo(cfg)
// 	if err != nil {
// 		return nil, err
// 	}

// 	d.Me, err = provideAccount(d.Repo)
// 	if err != nil {
// 		return nil, err
// 	}

// 	d.SQLite, err = provideSQLite(nil, d.Repo)
// 	if err != nil {
// 		return nil, err
// 	}
// 	d.clean.Add(d.SQLite)

// 	d.VCS = provideVCS(d.SQLite)

// 	d.Net = provideNetwork(nil, cfg, d.VCS, d.Me)
// 	// clean.Add(d.Net)

// 	d.GRPC = provideGRPCServer(nil, d.Net)
// }

// func startGRPC()

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

type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}

func logAppLifecycle(lc fx.Lifecycle, stop fx.Shutdowner, cfg config.Config, grpc *grpcServer, srv *httpServer, net *future.ReadOnly[*mttnet.Node]) {
	log := logging.New("mintter/daemon", "debug")

	if cfg.LetsEncrypt.Domain != "" {
		log.Warn("Let's Encrypt is enabled, HTTP-port configuration value is ignored, will listen on the default TLS port (443)")
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				<-grpc.ready
				<-srv.ready
				log.Info("DaemonStarted",
					zap.String("grpcListener", grpc.lis.Addr().String()),
					zap.String("httpListener", srv.lis.Addr().String()),
					zap.String("repoPath", cfg.RepoPath),
				)
				net, err := net.Await(context.Background())
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
