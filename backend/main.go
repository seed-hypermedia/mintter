package backend

import (
	"context"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"mintter/backend/badger3ds"
	"mintter/backend/badgergraph"
	"mintter/backend/config"
	"mintter/backend/db/graphschema"
	"mintter/backend/logging"
)

var moduleBackend = fx.Options(
	fx.Provide(
		provideRepo,
		provideBadger,
		provideBadgerGraph,
		providePatchStore,
		provideBackend,
	),
	// We have to make this trick so that we ensure proper shutdown order:
	// HTTP -> GRPC -> Backend and all its dependencies. There's probably
	// a better way to do it, but I couldn't find one that would expose
	// the listeners for tests properly.
	fx.Invoke(func(b *backend) error { return nil }),
)

// Module assembles everything that is required to run the app using fx framework.
func Module(cfg config.Config) fx.Option {
	return fx.Options(
		fx.Supply(cfg),
		fx.Logger(&fxLogger{zap.NewNop().Sugar()}), // sometimes we may want to pass real zap logger here.
		fx.Provide(
			provideP2PConfig,
			provideDatastore,
		),
		moduleP2P,
		moduleBackend,
		moduleGRPC,
		moduleHTTP,
		fx.Invoke(logAppLifecycle),
	)
}

func providePatchStore(bs blockstore.Blockstore, db *badgergraph.DB) (*patchStore, error) {
	return newPatchStore(logging.Logger("mintter/patch-store", "debug"), bs, db)
}

func provideBackend(lc fx.Lifecycle, stop fx.Shutdowner, r *repo, store *patchStore, p2p *p2pNode) (*backend, error) {
	back := newBackend(logging.Logger("mintter/backend", "debug"), r, store, p2p)

	ctx, cancel := context.WithCancel(context.Background())
	errc := make(chan error, 1)

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				err := back.Start(ctx)
				if err != nil && err != context.Canceled {
					if err := stop.Shutdown(); err != nil {
						panic(err)
					}
				}
				errc <- err
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			cancel()
			return <-errc
		},
	})

	return back, nil
}

func logAppLifecycle(lc fx.Lifecycle, stop fx.Shutdowner, cfg config.Config, grpc *grpcServer, srv *httpServer, back *backend) {
	log := logging.Logger("mintter/daemon", "debug")

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
					zap.String("version", Version),
				)
				<-back.p2p.Ready()
				addrs, err := back.p2p.libp2p.Network().InterfaceListenAddresses()
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

func provideP2PConfig(cfg config.Config) config.P2P {
	return cfg.P2P
}

func provideDatastore(lc fx.Lifecycle, r *repo) (datastore.Batching, error) {
	ds, err := badger3ds.NewDatastore(badger3ds.DefaultOptions(r.badgerDir()))
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			return ds.Close()
		},
	})

	return ds, nil
}

func provideBadger(ds datastore.Batching) *badger.DB {
	return ds.(*badger3ds.Datastore).DB
}

func provideBadgerGraph(lc fx.Lifecycle, db *badger.DB) (*badgergraph.DB, error) {
	gdb, err := badgergraph.NewDB(db, "mintter", graphschema.Schema())
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

func provideRepo(cfg config.Config) (*repo, error) {
	return newRepo(cfg.RepoPath, logging.Logger("mintter/repo", "debug"))
}

type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}
