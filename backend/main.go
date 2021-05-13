package backend

import (
	"context"
	"net"
	"net/http"
	"path/filepath"

	"github.com/dgraph-io/badger/v3"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	networking "mintter/api/go/networking/v1alpha"
	"mintter/backend/badger3ds"
	"mintter/backend/badgergraph"
	"mintter/backend/config"
)

// This file holds various initialization functions that are compose by the FX framework.
// Init logic became very unwieldy to manage manually, especially because IPFS components
// have some weird usage of context occasionally, and there're a lot of moving pieces.
// DI framework made everything a lot easier to reason about.

// NewLogger creates a new logger from config.
func NewLogger(cfg config.Config) *zap.Logger {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		panic(err)
	}
	return log
}

func Logger(lc fx.Lifecycle, cfg config.Config) (*zap.Logger, error) {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			err := log.Sync()
			_ = err
			return nil
		},
	})

	return log, nil
}

func Datastore(lc fx.Lifecycle, cfg config.Config) (*badger3ds.Datastore, error) {
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

func Badger(ds *badger3ds.Datastore) *badger.DB {
	return ds.DB
}

func BadgerGraph(lc fx.Lifecycle, db *badger.DB) (*badgergraph.DB, error) {
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

func Repo(cfg config.Config, log *zap.Logger) (*repo, error) {
	return newRepo(cfg.RepoPath, log.Named("repo"))
}

func P2PNode(lc fx.Lifecycle, cfg config.Config, r *repo, log *zap.Logger, ds *badger3ds.Datastore) (*p2pNode, error) {
	p2p, err := newP2PNode(cfg.P2P, r, log.Named("p2p"), ds)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithCancel(context.Background())
	errc := make(chan error, 1)
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				errc <- p2p.Run(ctx)
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			cancel()
			return <-errc
		},
	})

	return p2p, nil
}

func Blockstore(p2p *p2pNode) blockstore.Blockstore {
	return p2p.Blockstore()
}

func PatchStore(bs blockstore.Blockstore, gdb *badgergraph.DB) (*patchStore, error) {
	return newPatchStore(bs, gdb)
}

type GRPCListener net.Listener

func GRPCServer(lc fx.Lifecycle, cfg config.Config) (*grpc.Server, <-chan GRPCListener, error) {
	srv := grpc.NewServer()

	lisc := make(chan GRPCListener, 1)
	errc := make(chan error, 1)
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var lc net.ListenConfig
			lis, err := lc.Listen(ctx, "tcp", ":"+cfg.GRPCPort)
			if err != nil {
				return err
			}
			lisc <- GRPCListener(lis)
			go func() {
				errc <- srv.Serve(lis)
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			srv.GracefulStop()
			return <-errc
		},
	})

	return srv, lisc, nil
}

func NetworkingServer(p2p *p2pNode) *networkingServer {
	return newNetworkingServer(p2p)
}

func Backend(r *repo, p2p *p2pNode, patches *patchStore) *backend {
	return newBackend(r, p2p, patches)
}

func RegisterGRPC(srv *grpc.Server, b *backend, n *networkingServer) {
	b.RegisterGRPCServices(srv)
	networking.RegisterNetworkingServer(srv, n)
	reflection.Register(srv)
}

type HTTPListener net.Listener

func HTTPServer(lc fx.Lifecycle, cfg config.Config) (*http.Server, <-chan HTTPListener, error) {
	srv := &http.Server{}

	lisc := make(chan HTTPListener, 1)
	errc := make(chan error, 1)

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var liscfg net.ListenConfig
			l, err := liscfg.Listen(ctx, "tcp", ":"+cfg.HTTPPort)
			if err != nil {
				return err
			}
			lisc <- HTTPListener(l)
			go func() {
				errc <- srv.Serve(l)
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			err := srv.Shutdown(ctx)
			<-errc
			return err
		},
	})

	return srv, lisc, nil
}

func RegisterHTTP(lc fx.Lifecycle, srv *http.Server, h http.Handler) {
	srv.Handler = h
}

func LogLifecycle(lc fx.Lifecycle, log *zap.Logger, cfg config.Config, lisc <-chan GRPCListener) {
	log = log.Named("daemon")
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				lis := <-lisc
				log.Info("DaemonStarted",
					zap.String("grpcListener", lis.Addr().String()),
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

// NewApp build the fx.App.
func NewApp(cfg config.Config, log *zap.Logger, opts ...fx.Option) *fx.App {
	return fx.New(
		fx.Supply(cfg),
		fx.Supply(log),
		fx.Provide(
			P2PNode,
			httpHandler,
			Repo,
			Datastore,
			Badger,
			BadgerGraph,
			Blockstore,
			PatchStore,
			GRPCServer,
			HTTPServer,
			NetworkingServer,
			Backend,
		),
		fx.Logger(&fxLogger{log.Named("fx").Sugar()}),
		fx.Invoke(RegisterGRPC),
		fx.Invoke(RegisterHTTP),
		fx.Invoke(LogLifecycle),
		fx.Options(opts...),
	)
}

type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}
