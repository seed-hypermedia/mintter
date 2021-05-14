package backend

import (
	"context"
	"errors"
	"net"
	"net/http"

	"go.uber.org/fx"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	accounts "mintter/api/go/accounts/v1alpha"
	daemon "mintter/api/go/daemon/v1alpha"
	networking "mintter/api/go/networking/v1alpha"
	"mintter/backend/config"
)

var moduleGRPC = fx.Options(
	fx.Provide(
		newNetworkingAPI,
		newAccountsAPI,
		newDaemonAPI,
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

func provideGRPCServer(lc fx.Lifecycle, cfg config.Config) (*grpcServer, *grpc.Server, error) {
	srv := &grpcServer{
		grpc:  grpc.NewServer(),
		ready: make(chan struct{}),
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var lc net.ListenConfig
			lis, err := lc.Listen(ctx, "tcp", ":"+cfg.GRPCPort)
			if err != nil {
				return err
			}
			srv.lis = lis
			go func() {
				close(srv.ready)
				if err := srv.grpc.Serve(lis); err != nil {
					panic(err) // Proper shutdown will return nil.
				}
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			srv.grpc.GracefulStop()
			return nil
		},
	})

	return srv, srv.grpc, nil
}

func registerGRPC(srv *grpc.Server, dsrv daemon.DaemonServer, asrv accounts.AccountsServer, nsrv networking.NetworkingServer) {
	accounts.RegisterAccountsServer(srv, asrv)
	networking.RegisterNetworkingServer(srv, nsrv)
	daemon.RegisterDaemonServer(srv, dsrv)
	reflection.Register(srv)
}

type httpServer struct {
	srv   *http.Server
	lis   net.Listener
	ready chan struct{}
}

func provideHTTPServer(lc fx.Lifecycle, cfg config.Config) (*httpServer, *http.Server, error) {
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
				if !errors.Is(err, http.ErrServerClosed) {
					panic(err) // Initialization bug. Should crash.
				}
				errc <- err
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			err := wrap.srv.Shutdown(ctx)
			<-errc
			return err
		},
	})

	return wrap, wrap.srv, nil
}

func registerHTTP(lc fx.Lifecycle, srv *http.Server, h http.Handler) {
	srv.Handler = h
}
