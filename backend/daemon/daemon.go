// Package daemon is an entrypoint for the Mintter local daemon app.
package daemon

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"

	proto "mintter/api/go/v2"
	v2 "mintter/api/go/v2"
	"mintter/backend"
	"mintter/backend/config"
	"mintter/backend/document"
	"mintter/backend/identity"
	"mintter/backend/logging"
	"mintter/backend/p2p"
	"mintter/backend/server"
	"mintter/backend/store"
	"mintter/backend/ui"

	grpc_auth "github.com/grpc-ecosystem/go-grpc-middleware/auth"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/mattn/go-isatty"
	"github.com/pkg/browser"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/atomic"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/crypto/acme/autocert"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

var log *logging.ZapEventLogger

func authFunc(ctx context.Context) (context.Context, error) {
	return document.AdminContext(ctx), nil
}

func stripPort(hostport, sslPort string) string {
	host, _, err := net.SplitHostPort(hostport)
	if err != nil {
		return net.JoinHostPort(hostport, sslPort)
	}
	return net.JoinHostPort(host, sslPort)
}

// createRedirectHandler returns a http.Handler that will redirect
// http to https taking into account HTTPSPort
func createRedirectHandler(sslPort string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" && r.Method != "HEAD" {
			http.Error(w, "Use HTTPS", http.StatusBadRequest)
			return
		}

		target := "https://" + stripPort(r.Host, sslPort) + r.URL.RequestURI()
		http.Redirect(w, r, target, http.StatusFound)
	})
}

// Run the daemon.
//
// TODO: refactor this to create a Daemon struct that will be easy to interact with in tests.
func Run(ctx context.Context, cfg config.Config) (err error) {
	g, ctx := errgroup.WithContext(ctx)

	server.SetUIConfig(cfg.UI)

	logging.DisabledTelemetry = cfg.DisableTelemetry
	if isatty.IsTerminal(os.Stdout.Fd()) {
		logging.SetAllLoggers(logging.LevelDebug)
	}

	log = logging.Logger("daemon")

	defer func() {
		if err := log.Sync(); err != nil {
			_ = err
		}
	}()

	defer log.Info("GracefulShutdownEnded")

	rpcsrv := grpc.NewServer(
		grpc.UnaryInterceptor(grpc_auth.UnaryServerInterceptor(authFunc)),
		grpc.StreamInterceptor(grpc_auth.StreamServerInterceptor(authFunc)),
	)
	docserver := &lazyDocumentsServer{}

	// TODO: this is messy and creepy. Due to our lazy initialization process we have to do this
	// in order to be able to register the RPC hander before calling serve, because this is a requirement.
	initFunc := server.InitFunc(func(prof identity.Profile) (*store.Store, *p2p.Node, error) {
		s, n, err := server.InitFuncFromConfig(cfg, log)(prof)
		if err != nil {
			return s, n, err
		}

		hostname, _ := os.Hostname()
		log.Debug("ServerInitialized", zap.String("repoPath", cfg.RepoPath), zap.String("domain", cfg.Domain), zap.Bool("DisableTelemetry", cfg.DisableTelemetry), zap.String("hostname", hostname))

		docserver.Init(n.DocServer())
		return s, n, nil
	})

	{
		s, err := server.NewServer(initFunc, logging.Logger("rpc"))
		if err != nil {
			return fmt.Errorf("failed to create rpc server: %w", err)
		}
		defer func() {
			err = multierr.Append(err, s.Close())
		}()

		proto.RegisterMintterServer(rpcsrv, s)
		v2.RegisterDocumentsServer(rpcsrv, docserver)
		reflection.Register(rpcsrv)
	}

	log = logging.Logger("daemon")

	var handler http.Handler
	{
		grpcWebHandler := grpcweb.WrapServer(rpcsrv, grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}))

		ui := ui.Handler()

		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r) {
				grpcWebHandler.ServeHTTP(w, r)
				return
			}

			ui.ServeHTTP(w, r)
		})
	}

	mux := http.NewServeMux()
	// mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
	// 	fmt.Fprintf(w, "User-agent: *\nDisallow: /\n")
	// })
	mux.HandleFunc("/_debug/build-info", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Version: %s\n", backend.Version)
	})
	mux.Handle("/metrics", promhttp.Handler())
	mux.Handle("/", handler)

	// TODO(burdiyan): Add timeout configuration.
	httpSrv := &http.Server{
		Handler: mux,
	}

	grpcListener, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		return fmt.Errorf("failed to bind grpc listener: %w", err)
	}
	defer grpcListener.Close()
	grpcURL := "grpc://" + formatAddr(grpcListener.Addr())

	// Start gRPC server with graceful shutdown.
	g.Go(func() error {
		return rpcsrv.Serve(grpcListener)
	})

	// Start HTTP server with graceful shutdown.
	httpListener, err := net.Listen("tcp", ":"+cfg.HTTPPort)
	if err != nil {
		return fmt.Errorf("failed to bind http listener: %w", err)
	}
	defer httpListener.Close()
	httpURL := "http://" + formatAddr(httpListener.Addr())

	g.Go(func() error {
		err := httpSrv.Serve(httpListener)
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}

		return err
	})

	var logParams []zap.Field
	logParams = append(logParams, zap.String("httpURL", httpURL))
	logParams = append(logParams, zap.String("grpcURL", grpcURL))

	// Start HTTPS server and generate Let's Encrypt certificate
	httpsSrv := http.Server{}
	if cfg.Domain != "" {
		certManager := autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist(cfg.Domain),
			Cache:      autocert.DirCache(cfg.RepoPath + "/certs"),
		}

		httpsSrv = http.Server{
			Addr:      ":" + cfg.HTTPSPort,
			Handler:   mux,
			TLSConfig: &tls.Config{GetCertificate: certManager.GetCertificate},
		}
		// redirect from http to https
		fallback := createRedirectHandler(cfg.HTTPSPort)
		httpSrv.Handler = certManager.HTTPHandler(fallback)

		g.Go(func() error {
			err := httpsSrv.ListenAndServeTLS("", "")
			if err != nil {
				return err
			}
			return nil
		})

		httpsURL := "https://" + cfg.Domain + httpsSrv.Addr
		logParams = append(logParams, zap.String("httpsURL", httpsURL))
	}

	log.Info("ServerStarted", logParams...)
	g.Go(func() error {
		<-ctx.Done()
		log.Info("GracefulShutdownStarted")
		log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")
		rpcsrv.GracefulStop()
		err := multierr.Combine(
			httpsSrv.Shutdown(context.Background()),
			httpSrv.Shutdown(context.Background()),
		)
		return err
	})

	if isatty.IsTerminal(os.Stdout.Fd()) && !cfg.NoOpenBrowser {
		if err := browser.OpenURL(httpURL); err != nil {
			_ = err
		}
	}

	log.Debug("Press ctrl+c to quit")

	err = g.Wait()

	return
}

func formatAddr(a net.Addr) string {
	port := a.(*net.TCPAddr).Port
	return "localhost:" + strconv.Itoa(port)
}

var errInit = status.Error(codes.Unimplemented, "server is not initialized yet")

type lazyDocumentsServer struct {
	ready atomic.Bool
	srv   v2.DocumentsServer
}

func (l *lazyDocumentsServer) CreateDraft(ctx context.Context, in *v2.CreateDraftRequest) (*v2.Document, error) {
	if l.ready.Load() {
		return l.srv.CreateDraft(ctx, in)
	}
	return nil, errInit
}

func (l *lazyDocumentsServer) UpdateDraft(ctx context.Context, in *v2.UpdateDraftRequest) (*v2.UpdateDraftResponse, error) {
	if l.ready.Load() {
		return l.srv.UpdateDraft(ctx, in)
	}
	return nil, errInit
}

func (l *lazyDocumentsServer) PublishDraft(ctx context.Context, in *v2.PublishDraftRequest) (*v2.PublishDraftResponse, error) {
	if l.ready.Load() {
		return l.srv.PublishDraft(ctx, in)
	}
	return nil, errInit
}

func (l *lazyDocumentsServer) GetDocument(ctx context.Context, in *v2.GetDocumentRequest) (*v2.GetDocumentResponse, error) {
	if l.ready.Load() {
		return l.srv.GetDocument(ctx, in)
	}
	return nil, errInit
}

func (l *lazyDocumentsServer) ListDocuments(ctx context.Context, in *v2.ListDocumentsRequest) (*v2.ListDocumentsResponse, error) {
	if l.ready.Load() {
		return l.srv.ListDocuments(ctx, in)
	}
	return nil, errInit
}

func (l *lazyDocumentsServer) DeleteDocument(ctx context.Context, in *v2.DeleteDocumentRequest) (*emptypb.Empty, error) {
	if l.ready.Load() {
		return l.srv.DeleteDocument(ctx, in)
	}
	return nil, errInit
}

func (l *lazyDocumentsServer) Init(srv v2.DocumentsServer) {
	l.srv = srv
	l.ready.Store(true)
}
