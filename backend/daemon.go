package backend

import (
	"context"
	"fmt"
	"net"
	"path/filepath"

	"mintter/backend/config"

	daemon "mintter/api/go/daemon/v1alpha"

	badger "github.com/ipfs/go-ds-badger"

	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
)

func Run(ctx context.Context, cfg config.Config) (err error) {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		return err
	}
	defer log.Sync()

	repo, err := newRepo(cfg.RepoPath, log.Named("repo"))
	if err != nil {
		return fmt.Errorf("failed to create repo: %w", err)
	}

	ds, err := badger.NewDatastore(filepath.Join(cfg.RepoPath, "ipfs"), &badger.DefaultOptions)
	if err != nil {
		return fmt.Errorf("failed to create datastore: %w", err)
	}
	defer ds.Close()

	p2p, err := newP2PNode(cfg.P2P, ds, repo.privKey())
	if err != nil {
		return fmt.Errorf("failed to create p2p node: %w", err)
	}

	back := newBackend(repo, p2p, nil) // TODO: wire in everything. Use Badger v3.

	b, err := NewDaemon(cfg, back, log.Named("backend"))
	if err != nil {
		return fmt.Errorf("failed to create daemon: %w", err)
	}

	return b.Run(ctx)
}

type Daemon struct {
	backend *backend
	cfg     config.Config
	grpcsrv *grpc.Server
	log     *zap.Logger
}

func NewDaemon(cfg config.Config, back *backend, log *zap.Logger) (*Daemon, error) {
	b := &Daemon{
		backend: back,
		grpcsrv: grpc.NewServer(),
		log:     log,
	}

	daemon.RegisterDaemonServer(b.grpcsrv, b.backend)

	return b, nil
}

func (b *Daemon) Run(ctx context.Context) (err error) {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		l, err := net.Listen("tcp", ":"+b.cfg.GRPCPort)
		if err != nil {
			return err
		}

		return b.grpcsrv.Serve(l)
	})

	g.Go(func() error {
		<-ctx.Done()
		b.log.Info("GracefulShutdownStarted")
		b.log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")

		b.grpcsrv.GracefulStop()

		return nil
	})

	return g.Wait()
}
