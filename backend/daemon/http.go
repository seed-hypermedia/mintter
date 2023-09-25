package daemon

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/graphql"
	"mintter/backend/pkg/cleanup"
	"mintter/backend/wallet"
	"net"
	"net/http"
	"runtime/debug"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/exp/slices"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
)

// GenericHandler is to be called bay anyone wanting to register a
// new http handler.
type GenericHandler struct {
	// Path where the endpoint will be hosted.
	Path string
	// HTTP handler.
	Handler http.Handler
	// RoutePrefix | RouteNav.
	Mode int
}

// setupGraphQLHandlers sets up the GraphQL endpoints.
func setupGraphQLHandlers(r *Router, wallet *wallet.Service) {
	r.Handle("/graphql", corsMiddleware(graphql.Handler(wallet)), 0)
	r.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"), RouteNav)
}

// setupIPFSFileHandlers sets up the IPFS file endpoints for uploading and getting files.
func setupIPFSFileHandlers(r *Router, h IPFSFileHandler) {
	r.Handle("/ipfs/file-upload", http.HandlerFunc(h.UploadFile), 0)
	r.Handle("/ipfs/{cid}", http.HandlerFunc(h.GetFile), 0)
}

// setupDebugHandlers sets up the debug endpoints.
func setupDebugHandlers(r *Router) {
	r.Handle("/debug/metrics", promhttp.Handler(), RouteNav)
	r.Handle("/debug/pprof", http.DefaultServeMux, RoutePrefix|RouteNav)
	r.Handle("/debug/vars", http.DefaultServeMux, RoutePrefix|RouteNav)
	r.Handle("/debug/grpc", grpcLogsHandler(), RouteNav)
	r.Handle("/debug/buildinfo", buildInfoHandler(), RouteNav)
}

// setupGRPCWebHandler sets up the gRPC-Web handler.
func setupGRPCWebHandler(r *Router, rpc *grpc.Server) {
	grpcWebHandler := grpcweb.WrapServer(rpc, grpcweb.WithOriginFunc(func(origin string) bool {
		return true
	}))

	r.r.MatcherFunc(mux.MatcherFunc(func(r *http.Request, match *mux.RouteMatch) bool {
		return grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r)
	})).Handler(grpcWebHandler)
}

// IPFSFileHandler is an interface to pass to the router only the http handlers and
// not all the FileManager type.
type IPFSFileHandler interface {
	GetFile(http.ResponseWriter, *http.Request)
	UploadFile(http.ResponseWriter, *http.Request)
}

func initHTTP(
	port int,
	rpc *grpc.Server,
	clean *cleanup.Stack,
	g *errgroup.Group,
	wallet *wallet.Service,
	ipfsHandler IPFSFileHandler,
	extraHandlers ...GenericHandler,
) (srv *http.Server, lis net.Listener, err error) {
	router := &Router{r: mux.NewRouter()}

	setupDebugHandlers(router)
	setupGraphQLHandlers(router, wallet)
	setupIPFSFileHandlers(router, ipfsHandler)
	setupGRPCWebHandler(router, rpc)
	for _, handler := range extraHandlers {
		router.Handle(handler.Path, handler.Handler, handler.Mode)
	}
	router.Handle("/", http.HandlerFunc(router.Index), 0)

	srv = &http.Server{
		Addr:              ":" + strconv.Itoa(port),
		ReadHeaderTimeout: 5 * time.Second,
		// WriteTimeout:      10 * time.Second,
		IdleTimeout: 20 * time.Second,
		Handler:     router.r,
	}

	lis, err = net.Listen("tcp", srv.Addr)
	if err != nil {
		return
	}

	g.Go(func() error {
		err := srv.Serve(lis)
		if err == http.ErrServerClosed {
			return nil
		}
		return err
	})

	clean.AddErrFunc(func() error {
		return srv.Shutdown(context.Background())
	})

	return
}

// corsMiddleware allows different host/origins.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// allow cross domain AJAX requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
		next.ServeHTTP(w, r)
	})
}

func buildInfoHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		info, ok := debug.ReadBuildInfo()
		if !ok {
			http.Error(w, "doesn't support build info", http.StatusExpectationFailed)
			return
		}

		// Don't want to show information about all the dependencies.
		info.Deps = nil

		// Want to support text and json.
		wantJSON := slices.Contains(r.Header.Values("Accept"), "application/json") ||
			r.URL.Query().Get("format") == "json"

		if wantJSON {
			w.Header().Set("Content-Type", "application/json")

			enc := json.NewEncoder(w)
			enc.SetIndent("", "  ")

			if err := enc.Encode(info); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		} else {
			w.Header().Set("Content-Type", "text/plain")
			fmt.Fprint(w, info.String())
		}
	})
}
