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
	"mintter/backend/identity"
	"mintter/backend/p2p"
	"mintter/backend/server"
	"mintter/backend/store"
	"mintter/proto"
	v2 "mintter/proto/v2"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/pkg/browser"
	"go.uber.org/atomic"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
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
	docserver := &lazyDocumentsServer{}

	// TODO: this is messy and creepy. Due to our lazy initialization process we have to do this
	// in order to be able to register the RPC hander before calling serve, because this is a requirement.
	initFunc := server.InitFunc(func(prof identity.Profile) (*store.Store, *p2p.Node, error) {
		s, n, err := server.InitFuncFromConfig(cfg, log)(prof)
		if err != nil {
			return s, n, err
		}

		log.Debug("ServerInitialized", zap.String("repoPath", cfg.RepoPath))

		docserver.Init(n.DocServer())
		return s, n, nil
	})

	var svc *server.Server
	{
		s, err := server.NewServer(initFunc, log.Named("rpc"))
		if err != nil {
			return fmt.Errorf("failed to create rpc server: %w", err)
		}
		defer func() {
			err = multierr.Append(err, s.Close())
		}()

		proto.RegisterMintterServer(rpcsrv, s)
		proto.RegisterDocumentsServer(rpcsrv, s)
		v2.RegisterDocumentsServer(rpcsrv, docserver)
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

	if !cfg.NoOpenBrowser {
		browser.OpenURL("http://localhost:55001")
	}

	log.Debug("Press ctrl+c to quit")

	err = g.Wait()

	return
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
