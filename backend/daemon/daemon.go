// Package daemon is an entrypoint for the Mintter local daemon app.
package daemon

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"

	"mintter/backend/config"
	"mintter/backend/server"
	"mintter/proto"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// Run the daemon.
func Run(ctx context.Context, cfg config.Config) (err error) {
	g, ctx := errgroup.WithContext(ctx)
	if cfg.RepoPath == "" {
		cfg.RepoPath = defaultRepoPath()
	}

	log, err := zap.NewDevelopment()
	if err != nil {
		return err
	}
	defer log.Sync()

	rpcsrv := grpc.NewServer()
	{
		svc, err := server.NewServer(cfg, log.Named("rpcServer"))
		if err != nil {
			return fmt.Errorf("failed to create rpc server: %w", err)
		}
		defer func() {
			err = multierr.Append(err, svc.Close())
		}()

		proto.RegisterMintterServer(rpcsrv, svc)
		proto.RegisterDocumentsServer(rpcsrv, svc)
		reflection.Register(rpcsrv)
	}

	grpcWebHandler := grpcweb.WrapServer(rpcsrv,
		grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}),
	)

	// TODO(burdiyan): Add timeout configuration.
	srv := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: grpcWebHandler,
	}

	l, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		return fmt.Errorf("failed to bind grpc listener: %w", err)
	}
	defer func() {
		err = multierr.Append(err, l.Close())
	}()

	// Start gRPC server with graceful shutdown.

	g.Go(func() error {
		return rpcsrv.Serve(l)
	})

	g.Go(func() error {
		<-ctx.Done()
		log.Debug("ClosingGRPCServer")
		rpcsrv.GracefulStop()
		return nil
	})

	// Start HTTP server with graceful shutdown.

	g.Go(func() error {
		return srv.ListenAndServe()
	})

	g.Go(func() error {
		<-ctx.Done()
		log.Debug("ClosingHTTPServer")
		return srv.Shutdown(context.Background())
	})

	log.Info("ServerStarted",
		zap.String("httpURL", "http://localhost:"+cfg.HTTPPort),
		zap.String("grpcURL", "grpc://localhost:"+cfg.GRPCPort),
	)

	err = g.Wait()

	return
}

func defaultRepoPath() string {
	d, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	return filepath.Join(d, ".mtt")
}
