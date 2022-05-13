package daemon

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"

	"go.uber.org/fx"
	"go.uber.org/zap"
)

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
