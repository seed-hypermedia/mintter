package backend

import (
	"context"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-datastore"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"mintter/backend/badger3ds"
	"mintter/backend/badgergraph"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"
)

var moduleBackend = fx.Options(
	fx.Provide(
		provideP2PConfig,
		provideLibp2p,
		ipfsutil.DefaultBootstrapPeers,

		provideRepo,
		provideDatastore,
		provideBadger,
		provideBadgerGraph,
		newPatchStore,
		ipfsutil.NewBlockstore,
		newBackend,
	),
	// We have to make this trick so that we ensure proper shutdown order:
	// HTTP -> GRPC -> Backend and all its dependencies. There's probably
	// a better way to do it, but I couldn't find one that would expose
	// the listeners for tests properly.
	fx.Invoke(func(b *backend) error { return nil }),
)

type Handle struct {
}

// Module assembles everything that is required to run the app using fx framework.
func Module(cfg config.Config, log *zap.Logger) fx.Option {
	return fx.Options(
		fx.Supply(cfg),
		fx.Supply(log),
		fx.Logger(&fxLogger{log.Named("fx").Sugar()}), // Configure FX internal logging with zap.
		moduleBackend,
		moduleGRPC,
		moduleHTTP,
		fx.Invoke(logAppLifecycle),
	)
}

// NewLogger creates a new logger from config.
func NewLogger(cfg config.Config) *zap.Logger {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		panic(err)
	}
	return log
}

func logAppLifecycle(lc fx.Lifecycle, log *zap.Logger, cfg config.Config, grpc *grpcServer) {
	log = log.Named("daemon")
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				<-grpc.ready
				log.Info("DaemonStarted",
					zap.String("grpcListener", grpc.lis.Addr().String()),
					// zap.String("httpListener", hlis.Addr().String()),
					zap.String("repoPath", cfg.RepoPath),
					zap.String("version", Version),
				)
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

func provideBadger(ds datastore.Batching) *badger.DB {
	return ds.(*badger3ds.Datastore).DB
}

func provideBadgerGraph(lc fx.Lifecycle, db *badger.DB) (*badgergraph.DB, error) {
	gdb, err := badgergraph.NewDB(db, "mintter")
	if err != nil {
		return nil, err
	}
	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return gdb.Close()
		},
	})
	return gdb, nil
}

func provideRepo(cfg config.Config, log *zap.Logger) (*repo, error) {
	return newRepo(cfg.RepoPath, log.Named("repo"))
}

type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}
