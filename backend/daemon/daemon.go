// Package daemon assembles everything to boot the mintterd program. It's like main, but made a separate package
// to be importable and testable by other packages, because package main can't be imported.
package daemon

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/api"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/graphql"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/cleanup"
	"mintter/backend/pkg/future"
	"mintter/backend/syncing"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"mintter/backend/wallet"
	"net"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// App is the main Mintter Daemon application, holding all of its dependencies
// which can be used for embedding the daemon in other apps or for testing.
type App struct {
	clean cleanup.Stack
	g     *errgroup.Group

	log *zap.Logger

	Repo         *ondisk.OnDisk
	VCS          *vcs.SQLite
	DB           *sqlitex.Pool
	HTTPListener net.Listener
	HTTPServer   *http.Server
	GRPCListener net.Listener
	GRPCServer   *grpc.Server
	RPC          api.Server
	Net          *future.ReadOnly[*mttnet.Node]
	Me           *future.ReadOnly[core.Identity]
	Syncing      *future.ReadOnly[*syncing.Service]
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
func Load(ctx context.Context, cfg config.Config) (a *App, err error) {
	a = &App{
		log: logging.New("mintter/daemon", "debug"),
	}
	a.g, ctx = errgroup.WithContext(ctx)

	// If errors occurred during loading, we need to close everything
	// we managed to initialize so far, and wait for all the goroutines
	// to finish. If everything booted correctly, we need to close the cleanup stack
	// when the context is canceled, so the up is shut down gracefully.
	defer func() {
		if err != nil {
			err = multierr.Combine(err, a.clean.Close(), a.g.Wait())
		} else {
			a.g.Go(func() error {
				<-ctx.Done()
				return a.clean.Close()
			})
		}
	}()

	a.Repo, err = initRepo(cfg)
	if err != nil {
		return
	}

	a.DB, err = initSQLite(ctx, &a.clean, a.Repo.SQLitePath())
	if err != nil {
		return
	}

	a.VCS = vcs.New(a.DB)

	a.Me, err = initRegistration(ctx, a.g, a.Repo)
	if err != nil {
		return
	}

	a.Net, err = initNetwork(&a.clean, a.g, a.Me, cfg.P2P, a.VCS)
	if err != nil {
		return
	}

	a.Syncing, err = initSyncing(cfg.Syncing, &a.clean, a.g, a.DB, a.VCS, a.Me, a.Net)
	if err != nil {
		return
	}

	a.GRPCServer, a.GRPCListener, a.RPC, err = initGRPC(cfg.GRPCPort, &a.clean, a.g, a.Me, a.Repo, a.VCS, a.Net, a.Syncing)
	if err != nil {
		return
	}

	a.HTTPServer, a.HTTPListener, err = initHTTP(cfg.HTTPPort, a.GRPCServer, &a.clean, a.g, a.DB, a.Net, a.Me)
	if err != nil {
		return
	}

	a.setupLogging(ctx, cfg)

	return
}

func (a *App) setupLogging(ctx context.Context, cfg config.Config) {
	logging.SetLogLevel("autorelay", "debug")

	a.g.Go(func() error {
		a.log.Info("DaemonStarted",
			zap.String("grpcListener", a.GRPCListener.Addr().String()),
			zap.String("httpListener", a.HTTPListener.Addr().String()),
			zap.String("repoPath", cfg.RepoPath),
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

func initRepo(cfg config.Config) (*ondisk.OnDisk, error) {
	r, err := ondisk.NewOnDisk(cfg.RepoPath, logging.New("mintter/repo", "debug"))
	if errors.Is(err, ondisk.ErrRepoMigrate) {
		fmt.Fprintf(os.Stderr, `This version of the software has a backward-incompatible database change!
Please remove data inside %s or use a different repo path.

`, cfg.RepoPath)
		return nil, err
	}
	return r, nil
}

func initSQLite(ctx context.Context, clean *cleanup.Stack, path string) (*sqlitex.Pool, error) {
	pool, err := sqliteschema.Open(path, 0, 16)
	if err != nil {
		return nil, err
	}

	conn := pool.Get(ctx)
	err = sqliteschema.Migrate(conn)
	pool.Put(conn)
	if err != nil {
		return nil, err
	}

	clean.Add(pool)

	return pool, nil
}

func initRegistration(ctx context.Context, g *errgroup.Group, repo *ondisk.OnDisk) (*future.ReadOnly[core.Identity], error) {
	f := future.New[core.Identity]()

	g.Go(func() error {
		select {
		case <-repo.Ready():
		case <-ctx.Done():
			return ctx.Err()
		}

		acc, err := repo.Account()
		if err != nil {
			panic(err)
		}

		id := core.NewIdentity(acc, repo.Device())
		if err := f.Resolve(id); err != nil {
			return err
		}

		return nil
	})

	return f.ReadOnly, nil
}

func initNetwork(
	clean *cleanup.Stack,
	g *errgroup.Group,
	me *future.ReadOnly[core.Identity],
	cfg config.P2P,
	vcsh *vcs.SQLite,
) (*future.ReadOnly[*mttnet.Node], error) {
	f := future.New[*mttnet.Node]()

	ctx, cancel := context.WithCancel(context.Background())
	clean.AddErrFunc(func() error {
		cancel()
		return nil
	})

	g.Go(func() error {
		id, err := me.Await(ctx)
		if err != nil {
			return err
		}

		// We assume registration already happened.
		perma := vcstypes.NewAccountPermanode(id.AccountID())
		blk, err := vcs.EncodeBlock(perma)
		if err != nil {
			return err
		}

		n, err := mttnet.New(cfg, vcsh, blk.Cid(), id, logging.New("mintter/network", "debug"))
		if err != nil {
			return err
		}

		g.Go(func() error {
			return n.Start(ctx)
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
	vcsh *vcs.SQLite,
	me *future.ReadOnly[core.Identity],
	net *future.ReadOnly[*mttnet.Node],
) (*future.ReadOnly[*syncing.Service], error) {
	f := future.New[*syncing.Service]()

	ctx, cancel := context.WithCancel(context.Background())
	clean.AddErrFunc(func() error {
		cancel()
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

		svc := syncing.NewService(logging.New("mintter/syncing", "debug"), id, db, vcsh, node.Bitswap().NewSession, node.Client)
		svc.SetWarmupDuration(cfg.WarmupDuration)
		svc.SetPeerSyncTimeout(cfg.TimeoutPerPeer)
		svc.SetSyncInterval(cfg.Interval)

		g.Go(func() error {
			return svc.Start(ctx)
		})

		if err := f.Resolve(svc); err != nil {
			return err
		}

		return nil
	})

	return f.ReadOnly, nil
}

func initGRPC(
	port int,
	clean *cleanup.Stack,
	g *errgroup.Group,
	id *future.ReadOnly[core.Identity],
	repo *ondisk.OnDisk,
	v *vcs.SQLite,
	node *future.ReadOnly[*mttnet.Node],
	sync *future.ReadOnly[*syncing.Service],
) (srv *grpc.Server, lis net.Listener, rpc api.Server, err error) {
	lis, err = net.Listen("tcp", ":"+strconv.Itoa(port))
	if err != nil {
		return
	}

	srv = grpc.NewServer()

	rpc = api.New(id, repo, v, node, sync)
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

func initHTTP(
	port int,
	rpc *grpc.Server,
	clean *cleanup.Stack,
	g *errgroup.Group,
	db *sqlitex.Pool,
	node *future.ReadOnly[*mttnet.Node],
	me *future.ReadOnly[core.Identity],
) (srv *http.Server, lis net.Listener, err error) {
	var h http.Handler
	{
		ctx, cancel := context.WithCancel(context.Background())
		clean.AddErrFunc(func() error {
			cancel()
			return nil
		})

		g.Go(func() error {
			id, err := me.Await(ctx)
			if err != nil {
				return err
			}
			grpcWebHandler := grpcweb.WrapServer(rpc, grpcweb.WithOriginFunc(func(origin string) bool {
				return true
			}))

			router := mux.NewRouter()
			router.Handle("/debug/metrics", promhttp.Handler())
			router.PathPrefix("/debug/pprof").Handler(http.DefaultServeMux)
			router.PathPrefix("/debug/vars").Handler(http.DefaultServeMux)
			router.Handle("/graphql", corsMiddleware(graphql.Handler(wallet.New(db, node, id))))
			router.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"))

			nav := newNavigationHandler(router)

			router.MatcherFunc(mux.MatcherFunc(func(r *http.Request, match *mux.RouteMatch) bool {
				return grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r)
			})).Handler(grpcWebHandler)

			router.Handle("/", nav)

			h = router
			return nil
		})
	}

	srv = &http.Server{
		Addr:         ":" + strconv.Itoa(port),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		Handler:      h,
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
