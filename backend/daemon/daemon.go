// Package daemon assembles everything to boot the mintterd program. It's like main, but made a separate package
// to be importable and testable by other packages, because package main can't be imported.
package daemon

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/api"
	"mintter/backend/daemon/storage"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/cleanup"
	"mintter/backend/pkg/future"
	"mintter/backend/syncing"
	"mintter/backend/wallet"

	groups "mintter/backend/genproto/groups/v1alpha"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/gorilla/mux"
	"github.com/ipfs/boxo/exchange"
	"github.com/ipfs/boxo/exchange/offline"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.uber.org/multierr"
	"go.uber.org/zap"
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
func Load(ctx context.Context, cfg config.Config, r *storage.Dir, extraOpts ...interface{}) (a *App, err error) {
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

	a.Net, err = initNetwork(&a.clean, a.g, me, cfg.P2P, a.DB, a.Blobs, extraOpts...)
	if err != nil {
		return nil, err
	}

	a.Syncing, err = initSyncing(cfg.Syncing, &a.clean, a.g, a.DB, a.Blobs, me, a.Net)
	if err != nil {
		return nil, err
	}

	a.Wallet = wallet.New(ctx, logging.New("mintter/wallet", "debug"), a.DB, a.Net, me, cfg.Lndhub.Mainnet)

	extraHTTPHandlers := []GenericHandler{}
	for _, extra := range extraOpts {
		if httpHandler, ok := extra.(GenericHandler); ok {
			extraHTTPHandlers = append(extraHTTPHandlers, httpHandler)
		}
	}
	a.GRPCServer, a.GRPCListener, a.RPC, err = initGRPC(ctx, cfg.GRPC.Port, &a.clean, a.g, a.Storage, a.DB, a.Blobs, a.Net, a.Syncing, a.Wallet, extraOpts...)
	if err != nil {
		return nil, err
	}

	// Lazily initialize the file manager, because we need to wait for the P2P node to become ready.
	fm := &lazyFileManager{fm: future.New[*mttnet.FileManager]()}
	a.g.Go(func() error {
		n, err := a.Net.Await(ctx)
		if err != nil {
			return err
		}

		bs := a.Blobs.IPFSBlockstore()
		var e exchange.Interface = n.Bitswap()
		if cfg.Syncing.NoDiscovery {
			e = offline.Exchange(bs)
		}

		files := mttnet.NewFileManager(logging.New("mintter/file-manager", "debug"), bs, e, n.Provider())
		if err := fm.fm.Resolve(files); err != nil {
			return err
		}
		return nil
	})

	a.HTTPServer, a.HTTPListener, err = initHTTP(cfg.HTTP.Port, a.GRPCServer, &a.clean, a.g, a.Blobs, a.Wallet, fm, extraHTTPHandlers...)
	if err != nil {
		return nil, err
	}

	a.setupLogging(ctx, cfg)

	if !cfg.Syncing.NoPull {
		a.g.Go(func() error {
			return a.RPC.Groups.StartPeriodicSync(ctx, cfg.Syncing.WarmupDuration, cfg.Syncing.Interval)
		})
	}

	return
}

type lazyFileManager struct {
	fm future.Value[*mttnet.FileManager]
}

func (l *lazyFileManager) GetFile(w http.ResponseWriter, r *http.Request) {
	fm, err := l.fm.Await(r.Context())
	if err != nil {
		http.Error(w, "File manager is not ready yet", http.StatusPreconditionFailed)
		return
	}

	fm.GetFile(w, r)
}

func (l *lazyFileManager) UploadFile(w http.ResponseWriter, r *http.Request) {
	fm, err := l.fm.Await(r.Context())
	if err != nil {
		http.Error(w, "File manager is not ready yet", http.StatusPreconditionFailed)
		return
	}

	fm.UploadFile(w, r)
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
	extraServers ...interface{},
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

		n, err := mttnet.New(cfg, db, blobs, id, logging.New("mintter/network", "debug"), extraServers...)
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

		svc := syncing.NewService(logging.New("mintter/syncing", "debug"), id, db, blobs, node.Bitswap(), node.Client)
		svc.SetWarmupDuration(cfg.WarmupDuration)
		svc.SetPeerSyncTimeout(cfg.TimeoutPerPeer)
		svc.SetSyncInterval(cfg.Interval)

		if cfg.NoDiscovery {
			svc.DisableDiscovery = true
		}

		if cfg.NoPull {
			close(done)
		} else {
			g.Go(func() error {
				err := svc.Start(ctx)
				close(done)
				return err
			})
		}

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
	repo *storage.Dir,
	pool *sqlitex.Pool,
	blobs *hyper.Storage,
	node *future.ReadOnly[*mttnet.Node],
	sync *future.ReadOnly[*syncing.Service],
	wallet *wallet.Service,
	extras ...interface{},
) (srv *grpc.Server, lis net.Listener, rpc api.Server, err error) {
	lis, err = net.Listen("tcp", ":"+strconv.Itoa(port))
	if err != nil {
		return
	}

	opts := []grpc.ServerOption{}
	for _, extra := range extras {
		if opt, ok := extra.(grpc.ServerOption); ok {
			opts = append(opts, opt)
		}
	}
	srv = grpc.NewServer(opts...)

	rpc = api.New(ctx, repo, pool, blobs, node, sync, wallet)
	rpc.Register(srv)
	reflection.Register(srv)

	for _, extra := range extras {
		if extraServer, ok := extra.(groups.WebsiteServer); ok {
			groups.RegisterWebsiteServer(srv, extraServer)
			break
		}
	}

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
	h = instrumentHTTPHandler(h, path)

	if mode&RouteNav != 0 {
		r.r.PathPrefix(path).Handler(h)
	} else {
		r.r.Handle(path, h)
	}

	if mode&RouteNav != 0 {
		r.nav = append(r.nav, path)
	}
}

func (r *Router) Index(w http.ResponseWriter, req *http.Request) {
	for _, route := range r.nav {
		fmt.Fprintf(w, `<p><a href="%s">%s</a></p>`, route, route)
	}
}

// WithMiddleware generates an grpc option with the given middleware.
func WithMiddleware(i grpc.UnaryServerInterceptor) grpc.ServerOption {
	return grpc.UnaryInterceptor(i)
}
