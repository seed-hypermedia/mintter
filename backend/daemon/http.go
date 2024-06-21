package daemon

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"runtime/debug"
	"seed/backend/hyper"
	"seed/backend/pkg/cleanup"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	"github.com/ipld/go-ipld-prime"
	"github.com/ipld/go-ipld-prime/codec/dagjson"
	"github.com/ipld/go-ipld-prime/multicodec"
	"github.com/peterbourgon/trc/eztrc"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/exp/slices"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
)

var (
	commit string
	branch string
	date   string
)

// setupGraphQLHandlers sets up the GraphQL endpoints.
// TODO(hm24) add the wallet service back.
func setupGraphQLHandlers(r *Router, wallet any) {
	// r.Handle("/graphql", corsMiddleware(graphql.Handler(wallet)), 0)
	r.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"), RouteNav)
}

// setupIPFSFileHandlers sets up the IPFS file endpoints for uploading and getting files.
func setupIPFSFileHandlers(r *Router, h IPFSFileHandler) {
	r.Handle("/ipfs/file-upload", http.HandlerFunc(h.UploadFile), 0)
	r.Handle("/ipfs/{cid}", http.HandlerFunc(h.GetFile), 0)
}

// setupDebugHandlers sets up the debug endpoints.
func setupDebugHandlers(r *Router, blobs *hyper.Storage) {
	r.Handle("/debug/metrics", promhttp.Handler(), RouteNav)
	r.Handle("/debug/pprof", http.DefaultServeMux, RoutePrefix|RouteNav)
	r.Handle("/debug/vars", http.DefaultServeMux, RoutePrefix|RouteNav)
	r.Handle("/debug/grpc", grpcLogsHandler(), RouteNav)
	r.Handle("/debug/buildinfo", buildInfoHandler(), RouteNav)
	r.Handle("/debug/version", gitVersionHandler(), RouteNav)
	r.Handle("/debug/cid/{cid}", corsMiddleware(makeBlobDebugHandler(blobs.IPFSBlockstore())), 0)
	r.Handle("/debug/traces", eztrc.Handler(), RouteNav)
}

func makeBlobDebugHandler(bs blockstore.Blockstore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cs := mux.Vars(r)["cid"]
		if cs == "" {
			http.Error(w, "missing cid", http.StatusBadRequest)
			return
		}

		c, err := cid.Decode(cs)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		blk, err := bs.Get(r.Context(), c)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		dec, err := multicodec.LookupDecoder(c.Prefix().Codec)
		if err != nil {
			http.Error(w, "unknown decoder "+err.Error(), http.StatusBadRequest)
			return
		}

		node, err := ipld.Decode(blk.RawData(), dec)
		if err != nil {
			http.Error(w, "failed to decode IPFS block "+err.Error(), http.StatusInternalServerError)
			return
		}

		data, err := ipld.Encode(node, dagjson.Encode)
		if err != nil {
			http.Error(w, "failed to encode IPFS block "+err.Error(), http.StatusInternalServerError)
			return
		}

		var b bytes.Buffer
		if err := json.Indent(&b, data, "", "  "); err != nil {
			http.Error(w, "failed to format JSON "+err.Error(), http.StatusInternalServerError)
			return
		}

		_, _ = io.Copy(w, &b)
	}
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
	blobs *hyper.Storage,
	wallet any, // TODO(hm24) put the wallet back in.
	ipfsHandler IPFSFileHandler,
	extraHandlers ...func(*Router),
) (srv *http.Server, lis net.Listener, err error) {
	router := &Router{r: mux.NewRouter()}

	router.r.Use(
		handlerNameMiddleware,
		instrument,
	)

	setupDebugHandlers(router, blobs)
	setupGraphQLHandlers(router, wallet)
	setupIPFSFileHandlers(router, ipfsHandler)
	setupGRPCWebHandler(router, rpc)
	for _, handle := range extraHandlers {
		handle(router)
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

func gitVersionHandler() http.Handler {
	type gitInfo struct {
		Branch string `json:"branch,omitempty"`
		Commit string `json:"commit,omitempty"`
		Date   string `json:"date,omitempty"`
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var res gitInfo
		res.Branch = branch
		res.Commit = commit
		res.Date = date
		if err := json.NewEncoder(w).Encode(res); err != nil {
			http.Error(w, "Failed to marshal git version: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
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

var (
	mInFlightGauge = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "seed_http_requests_in_flight",
		Help: "Number of HTTP requests currently being served.",
	})

	mCounter = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "seed_http_requests_total",
			Help: "Total number of HTTP requests served.",
		},
		[]string{"code", "method"},
	)

	mDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "seed_http_request_duration_seconds",
			Help:    "HTTP request latencies.",
			Buckets: []float64{.25, .5, 1, 2.5, 5, 10},
		},
		[]string{"handler", "method"},
	)
)

var ctxKeyHandlerName struct{}

func handlerNameMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.String()
		route := mux.CurrentRoute(r)
		if route != nil {
			rn := route.GetName()
			if rn != "/" && rn != "" {
				name = rn
			}
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, &ctxKeyHandlerName, name)
		r = r.WithContext(ctx)

		h.ServeHTTP(w, r)
	})
}

func instrument(h http.Handler) http.Handler {
	h = eztrc.Middleware(func(r *http.Request) string {
		v := r.Context().Value(&ctxKeyHandlerName)
		if v == nil {
			panic("BUG: no handler name in context")
		}
		return v.(string)
	})(h)

	h = promhttp.InstrumentHandlerInFlight(mInFlightGauge, h)
	h = promhttp.InstrumentHandlerCounter(mCounter, h)
	h = promhttp.InstrumentHandlerDuration(mDuration, h, promhttp.WithLabelFromCtx("handler", func(ctx context.Context) string {
		v := ctx.Value(&ctxKeyHandlerName)
		if v == nil {
			panic("BUG: no handler name in context")
		}
		return v.(string)
	}))

	return h
}

const (
	// RoutePrefix exposes path prefix.
	RoutePrefix = 1 << 1
	// RouteNav adds the path to a route nav.
	RouteNav = 1 << 2
)

// Router is a wrapper around mux that can build the navigation menu.
type Router struct {
	r   *mux.Router
	nav []string
}

// Handle a route.
func (r *Router) Handle(path string, h http.Handler, mode int) {
	if mode&RouteNav != 0 {
		r.r.Name(path).PathPrefix(path).Handler(h)
	} else {
		r.r.Name(path).Path(path).Handler(h)
	}

	if mode&RouteNav != 0 {
		r.nav = append(r.nav, path)
	}
}

func (r *Router) Index(w http.ResponseWriter, _ *http.Request) {
	for _, route := range r.nav {
		fmt.Fprintf(w, `<p><a href="%s">%s</a></p>`, route, route)
	}
}
