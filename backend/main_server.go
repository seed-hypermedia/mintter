package backend

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"

	"go.uber.org/fx"
	"go.uber.org/multierr"
	"golang.org/x/crypto/acme/autocert"
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
		makeHTTPHandler,
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
	reflection.Register(srv)
	accounts.RegisterAccountsServer(srv, asrv)
	networking.RegisterNetworkingServer(srv, nsrv)
	daemon.RegisterDaemonServer(srv, dsrv)
	documents.RegisterDraftsServer(srv, docs)
	documents.RegisterPublicationsServer(srv, docs)
	documents.RegisterContentGraphServer(srv, docs)
}

// httpServer is a wrapper for HTTP server which is useful for lazy listener initialization.
// We can setup the server inside the FX provider function, but start actually listenning only
// inside the OnStart hook. The ready channel can be used to wait until the server is actually listening.
type httpServer struct {
	srv   *http.Server
	lis   net.Listener
	ready chan struct{}
}

func (s *httpServer) Serve() error {
	return s.srv.Serve(s.lis)
}

func (s *httpServer) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}

func provideHTTPServer(lc fx.Lifecycle, stop fx.Shutdowner, r *repo, cfg config.Config) (*httpServer, *http.Server, error) {
	wrap := &httpServer{
		srv: &http.Server{
			Addr: ":" + cfg.HTTPPort,
		},
		ready: make(chan struct{}),
	}

	needTLS := cfg.LetsEncrypt.Domain != ""

	// This gets used if Let's Encrypt is enabled in order to redirect HTTP to HTTPS.
	redirectSrv := &http.Server{
		Addr: ":http",
	}

	errc := make(chan error, 1)

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if needTLS {
				certManager := autocert.Manager{
					Prompt:     autocert.AcceptTOS,
					HostPolicy: autocert.HostWhitelist(cfg.LetsEncrypt.Domain),
					Email:      cfg.LetsEncrypt.Email,
					Cache:      autocert.DirCache(r.autocertDir()),
				}

				wrap.srv.Addr = ":https"
				wrap.srv.TLSConfig = certManager.TLSConfig()

				l, err := tls.Listen("tcp", ":https", wrap.srv.TLSConfig)
				if err != nil {
					return fmt.Errorf("failed to setup TLS listener: %w", err)
				}
				wrap.lis = l

				redirectSrv.Handler = certManager.HTTPHandler(nil)

				go func() {
					err := redirectSrv.ListenAndServe()
					if !errors.Is(err, http.ErrServerClosed) {
						if err := stop.Shutdown(); err != nil {
							panic(err)
						}
					}
				}()
			} else {
				var liscfg net.ListenConfig
				l, err := liscfg.Listen(ctx, "tcp", wrap.srv.Addr)
				if err != nil {
					return err
				}
				wrap.lis = l
			}

			go func() {
				close(wrap.ready)
				err := wrap.Serve()
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
				redirectSrv.Shutdown(ctx),
				wrap.Shutdown(ctx),
				<-errc,
			)
		},
	})

	return wrap, wrap.srv, nil
}

func registerHTTP(srv *http.Server, h http.Handler) {
	srv.Handler = h
}
