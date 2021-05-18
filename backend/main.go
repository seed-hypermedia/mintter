package backend

import (
	"context"
	"path/filepath"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-datastore"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"

	"mintter/backend/badger3ds"
	"mintter/backend/badgergraph"
	"mintter/backend/config"
)

var moduleBackend = fx.Options(
	fx.Provide(
		provideRepo,
		provideBadger,
		provideBadgerGraph,
		newPatchStore,
		provideBackend,
	),
	// We have to make this trick so that we ensure proper shutdown order:
	// HTTP -> GRPC -> Backend and all its dependencies. There's probably
	// a better way to do it, but I couldn't find one that would expose
	// the listeners for tests properly.
	fx.Invoke(func(b *backend) error { return nil }),
)

// Module assembles everything that is required to run the app using fx framework.
func Module(cfg config.Config, log *zap.Logger) fx.Option {
	return fx.Options(
		fx.Supply(cfg),
		fx.Supply(log),
		fx.Logger(&fxLogger{log.Named("fx").Sugar()}), // Configure FX internal logging with zap.
		fx.Provide(
			provideLifecycle,
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

// NewLogger creates a new logger from config.
func NewLogger(cfg config.Config) *zap.Logger {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		panic(err)
	}
	return log
}

func provideBackend(lc *lifecycle, r *repo, store *patchStore, p2p *p2pNode) (*backend, error) {
	back := newBackend(r, store, p2p)

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			lc.g.Go(func() error {
				return back.Start(lc.ctx)
			})
			return nil
		},
	})

	return back, nil
}

func logAppLifecycle(lc *lifecycle, log *zap.Logger, cfg config.Config, grpc *grpcServer, srv *httpServer, back *backend) {
	log = log.Named("daemon")
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
				<-back.ready
				addrs, err := back.p2p.Host.Network().InterfaceListenAddresses()
				if err != nil {
					panic(err)
				}
				log.Info("P2PNodeStarted", zap.Any("addrs", addrs))
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

func provideDatastore(lc *lifecycle, cfg config.Config) (datastore.Batching, error) {
	ds, err := badger3ds.NewDatastore(badger3ds.DefaultOptions(filepath.Join(cfg.RepoPath, "badger-v3")))
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

func provideBadgerGraph(lc *lifecycle, db *badger.DB) (*badgergraph.DB, error) {
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

// lifecycle wraps fx lifecycle with errgroup.Group,
// which can be used to spin up goroutines during application startup.
// This allows for better control of goroutines using the semantics of errgroup,
// meaning that if any goroutine fails to start, the other ones will short-circuit as well.
// The context inside the lifecycle is the one that these goroutines should watch for cancelation.
type lifecycle struct {
	fx.Lifecycle

	g   *errgroup.Group
	ctx context.Context
}

func provideLifecycle(lc fx.Lifecycle, stop fx.Shutdowner) *lifecycle {
	g, ctx, cancel := errgroupWithCancel()

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				<-ctx.Done()
				if err := stop.Shutdown(); err != nil {
					panic(err)
				}
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			cancel()
			err := g.Wait()
			if err == context.Canceled {
				return nil
			}
			return err
		},
	})

	return &lifecycle{
		Lifecycle: lc,
		g:         g,
		ctx:       ctx,
	}
}

func errgroupWithCancel() (*errgroup.Group, context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(context.Background())
	g, gctx := errgroup.WithContext(ctx)
	return g, gctx, cancel
}
