package daemon

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"

	"mintter/backend/server"
	"mintter/proto"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// Config is a daemon config.
type Config struct {
	HTTPPort string `help:"Port to expose HTTP server (including grpc-web)" default:"55001"`
	GRPCPort string `help:"Port to expose gRPC server" default:"55002"`
	RepoPath string `help:"Path to where to store node data (default: ~/.mtt)"`
}

// Run the daemon.
func Run(ctx context.Context, cfg Config) error {
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
		svc, err := server.NewServer(cfg.RepoPath, log.Named("rpcServer"))
		if err != nil {
			return fmt.Errorf("failed to create rpc server: %w", err)
		}

		proto.RegisterMintterServer(rpcsrv, svc)
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
	defer l.Close()

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

	return g.Wait()
}

func defaultRepoPath() string {
	d, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	return filepath.Join(d, ".mtt")
}
