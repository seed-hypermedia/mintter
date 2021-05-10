package backend

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"path/filepath"

	"mintter/backend/badger3ds"
	"mintter/backend/badgergraph"
	"mintter/backend/config"

	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"go.uber.org/zap"
)

// Daemon is Mintter local daemon.
// It encapsulates all the logic about the Mintter application.
// It's initialized lazily during the Run method invocation.
type Daemon struct {
	cfg   config.Config
	ready chan struct{}

	// These can only be accessed safely after ready is closed.
	backend *backend
	lis     net.Listener
}

func NewDaemon(cfg config.Config) *Daemon {
	return &Daemon{
		cfg:   cfg,
		ready: make(chan struct{}),
	}
}

// Run the daemon and block until ctx is canceled.
func (d *Daemon) Run(ctx context.Context) error {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		return err
	}
	defer log.Sync()

	cfg := d.cfg

	repo, err := newRepo(cfg.RepoPath, log.Named("repo"))
	if err != nil {
		return fmt.Errorf("failed to create repo: %w", err)
	}

	ds, err := badger3ds.NewDatastore(badger3ds.DefaultOptions(filepath.Join(cfg.RepoPath, "badger-v3")))
	if err != nil {
		return fmt.Errorf("failed to create datastore: %w", err)
	}
	defer func() {
		log.Debug("ClosedBadgerDB", zap.Error(ds.Close()))
	}()

	p2p, err := newP2PNode(cfg.P2P, ds, repo.privKey())
	if err != nil {
		return fmt.Errorf("failed to create p2p node: %w", err)
	}
	defer func() {
		log.Debug("ClosedP2PNode", zap.Error(p2p.Close()))
	}()

	db, err := badgergraph.NewDB(ds.DB, "mintter")
	if err != nil {
		return fmt.Errorf("failed to create db: %w", err)
	}
	defer func() {
		log.Debug("ClosedBadgerGraph", zap.Error(db.Close()))
	}()

	patches, err := newPatchStore(repo.Device().priv, p2p.ipfs.BlockStore(), db)
	if err != nil {
		return fmt.Errorf("failed to create patch store: %w", err)
	}

	d.backend = newBackend(repo, p2p, patches)

	srv := grpc.NewServer()

	d.backend.RegisterGRPCServices(srv)
	reflection.Register(srv)

	d.lis, err = net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		return fmt.Errorf("failed to craete GRPC litener: %w", err)
	}
	defer d.lis.Close()

	hlis, err := net.Listen("tcp", ":"+cfg.HTTPPort)
	if err != nil {
		return fmt.Errorf("failed to create HTTP listener: %w", err)
	}
	defer hlis.Close()

	hsrv := &http.Server{
		Handler: httpHandler(srv, d.backend),
	}

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		err := srv.Serve(d.lis)
		log.Info("CloseGRPCServerStopped")
		return err
	})
	g.Go(func() error {
		<-ctx.Done()
		log.Info("CloseGRPCServerStarted")
		srv.GracefulStop()
		return nil
	})

	g.Go(func() error {
		err := hsrv.Serve(hlis)
		if err == http.ErrServerClosed {
			err = nil
		}
		log.Info("CloseHTTPServerStopped")
		return err
	})
	g.Go(func() error {
		<-ctx.Done()
		log.Info("CloseHTTPServerStarted")
		return hsrv.Shutdown(context.Background())
	})

	mas, err := p2p.Addrs()
	if err != nil {
		return err
	}

	// TODO:
	// add let's encrypt
	// add frontend server
	log.Info("DaemonStarted",
		zap.String("grpcListener", d.lis.Addr().String()),
		zap.String("httpListener", hlis.Addr().String()),
		zap.Any("libp2pAddrs", mas),
		zap.String("repoPath", cfg.RepoPath),
		zap.String("version", Version),
	)

	close(d.ready)

	<-ctx.Done()
	log.Info("GracefulShutdownStarted")
	log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")

	return g.Wait()
}

func (d *Daemon) Backend() *backend {
	return d.backend
}

func (d *Daemon) GRPCAddr() net.Addr {
	return d.lis.Addr()
}

// Ready returns a channel that will be closed when daemon is fully initialized and ready to use.
// Useful for programmatic access to the daemon.
func (d *Daemon) Ready() <-chan struct{} {
	return d.ready
}
