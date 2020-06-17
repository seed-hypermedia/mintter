// Package daemon is an entrypoint for the Mintter local daemon app.
package daemon

import (
	"context"
	"errors"
	"fmt"
	"mintter"
	"net"
	"net/http"

	"mintter/backend/config"
	"mintter/backend/server"
	"mintter/proto"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/pkg/browser"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// Run the daemon.
func Run(ctx context.Context, cfg config.Config) (err error) {
	g, ctx := errgroup.WithContext(ctx)

	log, err := zap.NewDevelopment(zap.WithCaller(false))
	if err != nil {
		return err
	}
	defer log.Sync()

	defer log.Info("GracefulShutdownEnded")

	rpcsrv := grpc.NewServer()
	var svc *server.Server
	{
		s, err := server.NewServer(cfg, log)
		if err != nil {
			return fmt.Errorf("failed to create rpc server: %w", err)
		}
		defer func() {
			err = multierr.Append(err, s.Close())
		}()

		proto.RegisterMintterServer(rpcsrv, s)
		proto.RegisterDocumentsServer(rpcsrv, s)
		reflection.Register(rpcsrv)

		svc = s
	}

	log = log.Named("daemon")

	var handler http.Handler
	{
		grpcWebHandler := grpcweb.WrapServer(rpcsrv,
			grpcweb.WithOriginFunc(func(origin string) bool {
				return true
			}),
		)

		ui := mintter.UIHandler()

		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if grpcWebHandler.IsAcceptableGrpcCorsRequest(r) {
				grpcWebHandler.ServeHTTP(w, r)
				return
			}

			if grpcWebHandler.IsGrpcWebRequest(r) {
				grpcWebHandler.ServeHTTP(w, r)
				return
			}

			ui.ServeHTTP(w, r)
		})
	}

	mux := http.NewServeMux()
	mux.Handle("/_debug", svc.DebugHandler())
	mux.Handle("/", handler)

	// TODO(burdiyan): Add timeout configuration.
	srv := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: mux,
	}

	l, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		return fmt.Errorf("failed to bind grpc listener: %w", err)
	}
	// No need to close l because grpc server closes it during shutdown.

	// Start gRPC server with graceful shutdown.

	g.Go(func() error {
		return rpcsrv.Serve(l)
	})

	// Start HTTP server with graceful shutdown.

	g.Go(func() error {
		err := srv.ListenAndServe()
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}

		return err
	})

	g.Go(func() error {
		<-ctx.Done()
		log.Info("GracefulShutdownStarted")
		log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")
		rpcsrv.GracefulStop()
		return srv.Shutdown(context.Background())
	})

	log.Info("ServerStarted",
		zap.String("httpURL", "http://localhost:"+cfg.HTTPPort),
		zap.String("grpcURL", "grpc://localhost:"+cfg.GRPCPort),
	)

	browser.OpenURL("http://localhost:55001")
	log.Debug("Press ctrl+c to quit")

	err = g.Wait()

	return
}
