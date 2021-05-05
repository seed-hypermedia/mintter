package backend

import (
	"fmt"
	"io"
	"net"
	"path/filepath"

	"mintter/backend/badger3ds"
	"mintter/backend/badgergraph"
	"mintter/backend/cleanup"
	"mintter/backend/config"

	"google.golang.org/grpc"

	"go.uber.org/multierr"
	"go.uber.org/zap"
)

// StartDaemonWithConfig starts the daemon and all the required components using the provided configuration.
// Users must not call Close on the returned daemon instance. Instead everything will shutdown when provided
// context gets canceled. Callers may want to wait on the done channel to block until everything shuts down properly.
func StartDaemonWithConfig(cfg config.Config) (d *Daemon, err error) {
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		return nil, err
	}
	defer func() {
		err := log.Sync()
		_ = err
	}()

	var clean cleanup.Stack
	defer func() {
		// If we returned from this function with non-nil error
		// it means that something failed during the initialization,
		// hence here we close all the things that may have started correctly
		// before failure occurred.
		if err != nil {
			err = multierr.Append(err, clean.Close())
		}

		// This will be the top closer on the stack. Just to make sure
		// that we say something to the user when the shutdown starts.
		clean.AddErrFunc(func() error {
			log.Info("GracefulShutdownStarted")
			log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")
			return nil
		})
	}()

	repo, err := newRepo(cfg.RepoPath, log.Named("repo"))
	if err != nil {
		return nil, fmt.Errorf("failed to create repo: %w", err)
	}

	ds, err := badger3ds.NewDatastore(badger3ds.DefaultOptions(filepath.Join(cfg.RepoPath, "badger-v3")))
	if err != nil {
		return nil, fmt.Errorf("failed to create datastore: %w", err)
	}
	clean.Add(ds)

	p2p, err := newP2PNode(cfg.P2P, ds, repo.privKey())
	if err != nil {
		return nil, fmt.Errorf("failed to create p2p node: %w", err)
	}
	clean.Add(p2p)

	db, err := badgergraph.NewDB(ds.DB, "mintter")
	if err != nil {
		return nil, fmt.Errorf("failed to create db: %w", err)
	}
	clean.Add(db)

	patches, err := newPatchStore(repo.Device().priv, p2p.ipfs.BlockStore(), db)
	if err != nil {
		return nil, fmt.Errorf("failed to create patch store: %w", err)
	}

	back := newBackend(repo, p2p, patches)

	srv := grpc.NewServer()

	back.RegisterGRPCServices(srv)

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		return nil, err
	}

	clean.Go(func() error {
		err := srv.Serve(lis)
		log.Info("ClosedGRPCServer")
		return err
	}, func() error {
		srv.GracefulStop()
		return nil
	})

	mas, err := p2p.Addrs()
	if err != nil {
		return nil, err
	}

	// TODO: wrap grpc-web
	// expand repo path.
	// add let's encrypt
	// add frontend server
	log.Info("DaemonStarted",
		zap.String("grpcListener", lis.Addr().String()),
		zap.Any("libp2pAddrs", mas),
		zap.String("repoPath", cfg.RepoPath),
	)

	return &Daemon{
		clean:   &clean,
		backend: back,
		lis:     lis,
	}, nil
}

type Daemon struct {
	clean   io.Closer
	backend *backend
	lis     net.Listener
}

func (d *Daemon) Backend() *backend {
	return d.backend
}

func (d *Daemon) GRPCAddr() net.Addr {
	return d.lis.Addr()
}

func (d *Daemon) Close() error {
	return d.clean.Close()
}
