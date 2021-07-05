package backend

import (
	"context"
	"errors"
	"net"
	"net/http"

	"go.uber.org/fx"
	"go.uber.org/multierr"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	accounts "mintter/backend/api/accounts/v1alpha"
	daemon "mintter/backend/api/daemon/v1alpha"
	documents "mintter/backend/api/documents/v1alpha"
	networking "mintter/backend/api/networking/v1alpha"
	"mintter/backend/config"
)

var moduleGRPC = fx.Options(
	fx.Provide(
		newNetworkingAPI,
		newAccountsAPI,
		newDaemonAPI,
		newDocsAPI,
		provideGRPCServer,
	),
	fx.Invoke(registerGRPC),
)

// Must be registered after GRPC.
var moduleHTTP = fx.Options(
	fx.Provide(
		provideHTTPServer,
		newHTTPHandler,
	),
	fx.Invoke(registerHTTP),
)

type grpcServer struct {
	grpc  *grpc.Server
	lis   net.Listener
	ready chan struct{}
}

func provideGRPCServer(lc fx.Lifecycle, stop fx.Shutdowner, cfg config.Config) (*grpcServer, *grpc.Server, error) {
	srv := &grpcServer{
		grpc:  grpc.NewServer(),
		ready: make(chan struct{}),
	}

	errc := make(chan error, 1)
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var netc net.ListenConfig
			lis, err := netc.Listen(ctx, "tcp", ":"+cfg.GRPCPort)
			if err != nil {
				return err
			}
			srv.lis = lis

			go func() {
				close(srv.ready)
				err := srv.grpc.Serve(lis)
				if err != nil {
					if err := stop.Shutdown(); err != nil {
						panic(err)
					}
				}
				errc <- err
			}()

			return nil
		},
		OnStop: func(context.Context) error {
			srv.grpc.GracefulStop()
			return <-errc
		},
	})

	return srv, srv.grpc, nil
}

func registerGRPC(srv *grpc.Server,
	dsrv daemon.DaemonServer,
	asrv accounts.AccountsServer,
	nsrv networking.NetworkingServer,
	docs DocsServer,
) {
	accounts.RegisterAccountsServer(srv, asrv)
	networking.RegisterNetworkingServer(srv, nsrv)
	daemon.RegisterDaemonServer(srv, dsrv)
	documents.RegisterDraftsServer(srv, docs)
	documents.RegisterPublicationsServer(srv, docs)
	reflection.Register(srv)
}

type httpServer struct {
	srv   *http.Server
	lis   net.Listener
	ready chan struct{}
}

func provideHTTPServer(lc fx.Lifecycle, stop fx.Shutdowner, cfg config.Config) (*httpServer, *http.Server, error) {
	wrap := &httpServer{
		srv:   &http.Server{},
		ready: make(chan struct{}),
	}

	errc := make(chan error, 1)

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var liscfg net.ListenConfig
			l, err := liscfg.Listen(ctx, "tcp", ":"+cfg.HTTPPort)
			if err != nil {
				return err
			}
			wrap.lis = l

			go func() {
				close(wrap.ready)
				err := wrap.srv.Serve(l)
				if errors.Is(err, http.ErrServerClosed) {
					errc <- nil
					return
				}

				if err := stop.Shutdown(); err != nil {
					panic(err)
				}

				errc <- err
			}()

			return nil
		},
		OnStop: func(ctx context.Context) error {
			return multierr.Combine(
				wrap.srv.Shutdown(ctx),
				<-errc,
			)
		},
	})

	return wrap, wrap.srv, nil
}

func registerHTTP(srv *http.Server, h http.Handler) {
	srv.Handler = h
}
