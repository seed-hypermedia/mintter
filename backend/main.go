package backend

import (
	"context"
	"errors"
	"fmt"
	"os"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-datastore"
	dssync "github.com/ipfs/go-datastore/sync"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"mintter/backend/config"
	"mintter/backend/daemon"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/logging"
)

var moduleBackend = fx.Options(
	fx.Provide(
		provideRepo,
		provideSQLite,
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

func provideSQLite(lc fx.Lifecycle, r *repo) (*sqlitex.Pool, error) {
	pool, err := sqliteschema.Open(r.SQLitePath(), 0, 16)
	if err != nil {
		return nil, err
	}

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	if err := sqliteschema.Migrate(conn); err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return pool.Close()
		},
	})

	return pool, nil
}

func provideBackend(lc fx.Lifecycle, pool *sqlitex.Pool, stop fx.Shutdowner, r *repo, p2p *p2pNode) (*backend, error) {
	back := newBackend(logging.New("mintter/backend", "debug"), pool, r, p2p)

	ctx, cancel := context.WithCancel(context.Background())
	errc := make(chan error, 1)

	logging.SetLogLevel("p2p-circuit", "debug")
	logging.SetLogLevel("p2p-holepunch", "debug")

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				// Since the backend starts inside a goroutine, we need some way
				// to bubble up the error in case the initialization fails.
				// When unexpected error happens we want to short-circuit the application startup.
				// The only expected error is when context gets canceled, which could be caused by CTRL+C.
				err := back.Start(ctx)
				if err != nil && !errors.Is(err, context.Canceled) {
					if err := stop.Shutdown(); err != nil {
						panic(err)
					}
				}
				// In all the cases we want to send the return value so that we can wait in OnStop hook
				// until everything actually shuts down cleanly.
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

func provideDatastore(lc fx.Lifecycle) datastore.Batching {
	// TODO: revisit this to understand whether using an inmemory datastore
	// actually breaks anything from IPFS. Apparently a lot of the state that we were storing
	// in Badger is actually quite ephemeral even in the upstream IPFS implementation.
	// We'll see if any issues would appear during usage and adapt.
	ds := dssync.MutexWrap(datastore.NewMapDatastore())

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			return ds.Close()
		},
	})

	return ds
}

func provideRepo(cfg config.Config) (*repo, error) {
	r, err := daemon.NewOnDisk(cfg.RepoPath, logging.New("mintter/repo", "debug"))
	if errors.Is(err, daemon.ErrRepoMigrate) {
		fmt.Fprintf(os.Stderr, `
This version of the software has a backward-incompatible database change!
Please remove data inside %s or use a different repo path.
`, cfg.RepoPath)
		os.Exit(1)
	}
	return r, err
}

type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}
