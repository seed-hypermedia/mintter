// Package daemon assembles everything to boot the mintterd program. It's like main, but made a separate package
// to be importable and testable by other packages, because package main can't be imported.
package daemon

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/api"
	"mintter/backend/daemon/storage"
	"mintter/backend/graphql"
	"mintter/backend/hyper"
	"mintter/backend/ipfs"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/cleanup"
	"mintter/backend/pkg/future"
	"mintter/backend/syncing"
	"mintter/backend/wallet"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func init() {
	prometheus.MustRegister(collectors.NewBuildInfoCollector())
}

// App is the main Mintter Daemon application, holding all of its dependencies
// which can be used for embedding the daemon in other apps or for testing.
type App struct {
	clean cleanup.Stack
	g     *errgroup.Group

	log *zap.Logger

	Storage      *storage.Dir
	DB           *sqlitex.Pool
	HTTPListener net.Listener
	HTTPServer   *http.Server
	GRPCListener net.Listener
	GRPCServer   *grpc.Server
	RPC          api.Server
	Net          *future.ReadOnly[*mttnet.Node]
	Syncing      *future.ReadOnly[*syncing.Service]
	Blobs        *hyper.Storage
	Wallet       *wallet.Service
}

// Load all of the dependencies for the app, and start
// all the background goroutines.
//
// Most of the complexity here is due to our lazy initialization
// process. We need to startup every component and make it ready,
// even though in the beginning we don't have some of the prerequisites
// like the Mintter Account key. To mitigate this we're using futures
// which are resolved after the account is initialized.
//
// After Load returns without errors, the App is ready to use, although
// futures might not be resolved yet.
//
// To shut down the app gracefully cancel the provided context and call Wait().
func Load(ctx context.Context, cfg config.Config, grpcOpt ...grpc.ServerOption) (a *App, err error) {
	r, err := InitRepo(cfg.Base.DataDir, nil)
	if err != nil {
		return nil, err
	}

	return LoadWithStorage(ctx, cfg, r, grpcOpt...)
}

// LoadWithStorage is the same as Load, but allows to pass a custom storage.
// The storage must be created using the [InitRepo] function.
func LoadWithStorage(ctx context.Context, cfg config.Config, r *storage.Dir, grpcOpt ...grpc.ServerOption) (a *App, err error) {
	a = &App{
		log:     logging.New("mintter/daemon", "debug"),
		Storage: r,
	}
	a.g, ctx = errgroup.WithContext(ctx)

	// If errors occurred during loading, we need to close everything
	// we managed to initialize so far, and wait for all the goroutines
	// to finish. If everything booted correctly, we need to close the cleanup stack
	// when the context is canceled, so the app is shut down gracefully.
	defer func(a *App) {
		if err != nil {
			err = multierr.Combine(
				err,
				a.clean.Close(),
				a.g.Wait(),
			)
		} else {
			a.g.Go(func() error {
				<-ctx.Done()
				return a.clean.Close()
			})
		}
	}(a)

	tp := trace.NewTracerProvider(
		trace.WithSampler(trace.AlwaysSample()),
	)
	a.clean.AddErrFunc(func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return tp.Shutdown(ctx)
	})

	otel.SetTracerProvider(tp)

	a.DB, err = initSQLite(ctx, &a.clean, a.Storage.SQLitePath())
	if err != nil {
		return nil, err
	}

	a.Blobs = hyper.NewStorage(a.DB, logging.New("mintter/hyper", "debug"))
	if err := a.Blobs.MaybeReindex(ctx); err != nil {
		return nil, fmt.Errorf("failed to reindex database: %w", err)
	}

	me := a.Storage.Identity()

	a.Net, err = initNetwork(&a.clean, a.g, me, cfg.P2P, a.DB, a.Blobs)
	if err != nil {
		return nil, err
	}

	a.Syncing, err = initSyncing(cfg.Syncing, &a.clean, a.g, a.DB, a.Blobs, me, a.Net)
	if err != nil {
		return nil, err
	}

	a.Wallet = wallet.New(ctx, logging.New("mintter/wallet", "debug"), a.DB, a.Net, me, cfg.Lndhub.Mainnet)

	a.GRPCServer, a.GRPCListener, a.RPC, err = initGRPC(ctx, cfg.GRPC.Port, &a.clean, a.g, me, a.Storage, a.DB, a.Blobs, a.Net, a.Syncing, a.Wallet, grpcOpt...)
	if err != nil {
		return nil, err
	}

	fileManager := ipfs.NewManager(ctx, logging.New("mintter/ipfs", "debug"))

	// We can't use futures in ipfs.NewManager since we will incur in a
	// cyclic dependency loop between ipfs and mttnet packages. This is why
	// we need a separate Start function to be called when the necessary
	// resources (bitswap, blockstore, porvider, etc, ...) are available.
	a.g.Go(func() error {
		n, err := a.Net.Await(ctx)
		if err != nil {
			return err
		}

		return fileManager.Start(n.Blobs().IPFSBlockstore(), n.Bitswap(), n.Provider())
	})
	a.HTTPServer, a.HTTPListener, err = initHTTP(cfg.HTTP.Port, a.GRPCServer, &a.clean, a.g, a.DB, a.Net, me, a.Wallet, fileManager)
	if err != nil {
		return nil, err
	}

	a.setupLogging(ctx, cfg)

	return
}

func (a *App) setupLogging(ctx context.Context, cfg config.Config) {
	logging.SetLogLevel("autorelay", "info")
	a.g.Go(func() error {
		a.log.Info("DaemonStarted",
			zap.String("grpcListener", a.GRPCListener.Addr().String()),
			zap.String("httpListener", a.HTTPListener.Addr().String()),
			zap.String("dataDir", cfg.DataDir),
		)

		n, err := a.Net.Await(ctx)
		if err != nil {
			return err
		}

		select {
		case <-n.Ready():
		case <-ctx.Done():
			return ctx.Err()
		}

		addrs, err := n.Libp2p().Network().InterfaceListenAddresses()
		if err != nil {
			return err
		}

		a.log.Info("P2PNodeStarted", zap.Any("listeners", addrs))

		return nil
	})

	a.clean.AddErrFunc(func() error {
		a.log.Info("GracefulShutdownStarted")
		a.log.Debug("Press ctrl+c again to force quit, but it's better to wait :)")
		return nil
	})
}

// Wait will block until the app is shut down.
func (a *App) Wait() error {
	return a.g.Wait()
}

// InitRepo initializes the storage directory.
// Device can be nil in which case a random new device key will be generated.
func InitRepo(dataDir string, device crypto.PrivKey) (r *storage.Dir, err error) {
	log := logging.New("mintter/repo", "debug")
	if device == nil {
		r, err = storage.New(dataDir, log)
	} else {
		r, err = storage.NewWithDeviceKey(dataDir, log, device)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to init storage: %w", err)
	}

	if err := r.Migrate(); err != nil {
		return nil, err
	}

	return r, nil
}

func initSQLite(ctx context.Context, clean *cleanup.Stack, path string) (*sqlitex.Pool, error) {
	pool, err := storage.OpenSQLite(path, 0, 16)
	if err != nil {
		return nil, err
	}

	clean.Add(pool)

	return pool, nil
}

func initNetwork(
	clean *cleanup.Stack,
	g *errgroup.Group,
	me *future.ReadOnly[core.Identity],
	cfg config.P2P,
	db *sqlitex.Pool,
	blobs *hyper.Storage,
) (*future.ReadOnly[*mttnet.Node], error) {
	f := future.New[*mttnet.Node]()

	done := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	clean.AddErrFunc(func() error {
		cancel()
		// Wait until the network fully stops if it was ever started.
		if _, ok := f.Get(); ok {
			<-done
		}

		return nil
	})

	g.Go(func() error {
		id, err := me.Await(ctx)
		if err != nil {
			return err
		}

		n, err := mttnet.New(cfg, db, blobs, id, logging.New("mintter/network", "debug"))
		if err != nil {
			return err
		}

		g.Go(func() error {
			err := n.Start(ctx)
			close(done)
			return err
		})

		select {
		case <-n.Ready():
		case <-ctx.Done():
			return ctx.Err()
		}

		if err := f.Resolve(n); err != nil {
			return err
		}

		return nil
	})

	return f.ReadOnly, nil
}

func initSyncing(
	cfg config.Syncing,
	clean *cleanup.Stack,
	g *errgroup.Group,
	db *sqlitex.Pool,
	blobs *hyper.Storage,
	me *future.ReadOnly[core.Identity],
	net *future.ReadOnly[*mttnet.Node],
) (*future.ReadOnly[*syncing.Service], error) {
	f := future.New[*syncing.Service]()

	done := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	clean.AddErrFunc(func() error {
		cancel()
		// Wait for syncing service to stop fully if it was ever started.
		if _, ok := f.Get(); ok {
			<-done
		}
		return nil
	})

	g.Go(func() error {
		id, err := me.Await(ctx)
		if err != nil {
			return err
		}

		node, err := net.Await(ctx)
		if err != nil {
			return err
		}

		svc := syncing.NewService(logging.New("mintter/syncing", "debug"), id, db, blobs, node.Bitswap(), node.Client, cfg.NoInbound)
		svc.SetWarmupDuration(cfg.WarmupDuration)
		svc.SetPeerSyncTimeout(cfg.TimeoutPerPeer)
		svc.SetSyncInterval(cfg.Interval)

		g.Go(func() error {
			err := svc.Start(ctx)
			close(done)
			return err
		})

		if err := f.Resolve(svc); err != nil {
			return err
		}

		return nil
	})

	return f.ReadOnly, nil
}

func initGRPC(
	ctx context.Context,
	port int,
	clean *cleanup.Stack,
	g *errgroup.Group,
	id *future.ReadOnly[core.Identity],
	repo *storage.Dir,
	pool *sqlitex.Pool,
	blobs *hyper.Storage,
	node *future.ReadOnly[*mttnet.Node],
	sync *future.ReadOnly[*syncing.Service],
	wallet *wallet.Service,
	opts ...grpc.ServerOption,
) (srv *grpc.Server, lis net.Listener, rpc api.Server, err error) {
	lis, err = net.Listen("tcp", ":"+strconv.Itoa(port))
	if err != nil {
		return
	}

	srv = grpc.NewServer(opts...)

	rpc = api.New(ctx, repo, pool, blobs, node, sync, wallet)
	rpc.Register(srv)
	reflection.Register(srv)

	g.Go(func() error {
		return srv.Serve(lis)
	})

	clean.AddErrFunc(func() error {
		srv.GracefulStop()
		return nil
	})

	return
}

var (
	mInFlightGauge = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "http_in_flight_requests",
		Help: "A gauge of HTTP requests currently being served.",
	})

	mCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "A counter for HTTP requests.",
		},
		[]string{"code", "method"},
	)

	mDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "A histogram of HTTP latencies for requests.",
			Buckets: []float64{.25, .5, 1, 2.5, 5, 10},
		},
		[]string{"handler", "method"},
	)
)

func init() {
	prometheus.MustRegister(mInFlightGauge, mCounter, mDuration)
}

func instrumentHTTPHandler(h http.Handler, name string) http.Handler {
	return promhttp.InstrumentHandlerInFlight(mInFlightGauge,
		promhttp.InstrumentHandlerDuration(mDuration.MustCurryWith(prometheus.Labels{"handler": name}),
			promhttp.InstrumentHandlerCounter(mCounter, h),
		),
	)
}

func setRoute(m *mux.Router, path string, isPrefix bool, h http.Handler) {
	h = instrumentHTTPHandler(h, path)
	if isPrefix {
		m.PathPrefix(path).Handler(h)
	} else {
		m.Handle(path, h)
	}
}

const (
	routePrefix = 1 << 1
	routeNav    = 1 << 2
)

type router struct {
	r   *mux.Router
	nav []string
}

func (r *router) Handle(path string, h http.Handler, mode int) {
	h = instrumentHTTPHandler(h, path)

	if mode&routePrefix != 0 {
		r.r.PathPrefix(path).Handler(h)
	} else {
		r.r.Handle(path, h)
	}

	if mode&routeNav != 0 {
		r.nav = append(r.nav, path)
	}
}

func (r *router) Index(w http.ResponseWriter, req *http.Request) {
	for _, route := range r.nav {
		fmt.Fprintf(w, `<p><a href="%s">%s</a></p>`, route, route)
	}
}

func initHTTP(
	port int,
	rpc *grpc.Server,
	clean *cleanup.Stack,
	g *errgroup.Group,
	db *sqlitex.Pool,
	node *future.ReadOnly[*mttnet.Node],
	me *future.ReadOnly[core.Identity],
	wallet *wallet.Service,
	ipfsHandler ipfs.HTTPHandler,
) (srv *http.Server, lis net.Listener, err error) {
	var h http.Handler
	{
		grpcWebHandler := grpcweb.WrapServer(rpc, grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}))

		router := router{r: mux.NewRouter()}
		router.Handle("/debug/metrics", promhttp.Handler(), routeNav)
		router.Handle("/debug/pprof", http.DefaultServeMux, routePrefix|routeNav)
		router.Handle("/debug/vars", http.DefaultServeMux, routePrefix|routeNav)
		router.Handle("/debug/grpc", grpcLogsHandler(), routeNav)
		router.Handle("/debug/buildinfo", buildInfoHandler(), routeNav)
		router.Handle("/graphql", corsMiddleware(graphql.Handler(wallet)), 0)
		router.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"), routeNav)
		router.Handle(ipfs.IPFSRootRoute+ipfs.UploadRoute, http.HandlerFunc(ipfsHandler.UploadFile), 0)
		router.Handle(ipfs.IPFSRootRoute+ipfs.GetRoute, http.HandlerFunc(ipfsHandler.GetFile), 0)

		router.r.MatcherFunc(mux.MatcherFunc(func(r *http.Request, match *mux.RouteMatch) bool {
			return grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r)
		})).Handler(grpcWebHandler)

		router.Handle("/", http.HandlerFunc(router.Index), 0)

		h = router.r
	}

	srv = &http.Server{
		Addr:              ":" + strconv.Itoa(port),
		ReadHeaderTimeout: 5 * time.Second,
		// WriteTimeout:      10 * time.Second,
		IdleTimeout: 20 * time.Second,
		Handler:     h,
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

// WithMiddleware generates an grpc option with the given middleware.
func WithMiddleware(i grpc.UnaryServerInterceptor) grpc.ServerOption {
	return grpc.UnaryInterceptor(i)
}

// GwEssentials is a middleware to restrict incoming grpc calls to bare minimum for the gateway to work.
func GwEssentials(ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler) (interface{}, error) {
	methodSplitted := strings.Split(info.FullMethod, "/")
	if len(methodSplitted) < 2 || (strings.ToLower(methodSplitted[len(methodSplitted)-1]) != "getpublication" &&
		strings.ToLower(methodSplitted[len(methodSplitted)-1]) != "listcitations" &&
		strings.ToLower(methodSplitted[len(methodSplitted)-1]) != "getaccount") {
		return nil, fmt.Errorf("method: %s not allowed", info.FullMethod)
	}

	// Calls the handler
	h, err := handler(ctx, req)

	return h, err
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
