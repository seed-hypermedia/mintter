package daemon

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/graphql"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/wallet"
	"net"
	"net/http"
	"sort"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/fx"
	"go.uber.org/multierr"
	"golang.org/x/crypto/acme/autocert"
	"google.golang.org/grpc"
)

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

func provideHTTPServer(lc fx.Lifecycle, stop fx.Shutdowner, r *ondisk.OnDisk, cfg config.Config) (*httpServer, *http.Server, error) {
	wrap := &httpServer{
		srv: &http.Server{
			Addr:         ":" + cfg.HTTPPort,
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 10 * time.Second,
		},
		ready: make(chan struct{}),
	}

	needTLS := cfg.LetsEncrypt.Domain != ""

	// This gets used if Let's Encrypt is enabled in order to redirect HTTP to HTTPS.
	redirectSrv := &http.Server{
		Addr:         ":http",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	errc := make(chan error, 1)

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if needTLS {
				certManager := autocert.Manager{
					Prompt:     autocert.AcceptTOS,
					HostPolicy: autocert.HostWhitelist(cfg.LetsEncrypt.Domain),
					Email:      cfg.LetsEncrypt.Email,
					Cache:      autocert.DirCache(r.AutocertDir()),
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

// CORSMiddleware allows different host/origins.
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// allow cross domain AJAX requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
		next.ServeHTTP(w, r)
	})
}

func registerHTTP(cfg config.Config, srv *http.Server, g *grpc.Server, db *sqlitex.Pool, net *future.ReadOnly[*mttnet.Node]) error {
	var h http.Handler
	{
		grpcWebHandler := grpcweb.WrapServer(g, grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}))

		router := mux.NewRouter()

		router.Handle("/debug/metrics", promhttp.Handler())
		router.PathPrefix("/debug/pprof").Handler(http.DefaultServeMux)
		router.PathPrefix("/debug/vars").Handler(http.DefaultServeMux)
		router.Handle("/graphql", CORSMiddleware(graphql.Handler(wallet.New(db, net))))
		router.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"))

		nav := newNavigationHandler(router)

		router.MatcherFunc(mux.MatcherFunc(func(r *http.Request, match *mux.RouteMatch) bool {
			return grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r)
		})).Handler(grpcWebHandler)

		router.Handle("/", nav)

		h = router
	}

	srv.Handler = h

	return nil
}

func newNavigationHandler(router *mux.Router) http.Handler {
	var routes []string

	err := router.Walk(func(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
		u, err := route.URL()
		if err != nil {
			return err
		}
		routes = append(routes, u.String())
		return nil
	})
	if err != nil {
		panic(err)
	}
	sort.Strings(routes)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for _, r := range routes {
			fmt.Fprintf(w, `<p><a href="%s">%s</a></p>`, r, r)
		}
	})
}
