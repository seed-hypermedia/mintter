package lightning

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/lightninglabs/lndclient"
	"github.com/lightninglabs/loop"
	"github.com/lightninglabs/loop/liquidity"
	"github.com/lightninglabs/loop/loopd"
	"github.com/lightninglabs/loop/looprpc"
	"github.com/lightningnetwork/lnd/build"
	"github.com/lightningnetwork/lnd/lntypes"
	"github.com/lightningnetwork/lnd/signal"
	"go.uber.org/zap"

	"mintter/backend/config"
)

const (
	mainnetServer = "swap.lightning.today:11010"
	testnetServer = "test.swap.lightning.today:11010"
)

type noInterface interface{}

type Loop struct {
	sync.Mutex
	cfg           *config.Loop
	log           *zap.Logger
	loopRunning   int32
	loopStopped   bool
	adminMacaroon []byte
	interceptor   *signal.Interceptor
	wg            sync.WaitGroup
	quitChan      chan struct{}
	startTime     time.Time
	daemonRunning int32
	coreRunning   int32
}

type lndConfig struct {
	Host string `long:"host" description:"lnd instance rpc address"`

	// MacaroonDir is the directory that contains all the macaroon files
	// required for the remote connection.
	MacaroonDir string `long:"macaroondir" description:"DEPRECATED: Use macaroonpath."`

	// MacaroonPath is the path to the single macaroon that should be used
	// instead of needing to specify the macaroon directory that contains
	// all of lnd's macaroons. The specified macaroon MUST have all
	// permissions that all the subservers use, otherwise permission errors
	// will occur.
	MacaroonPath string `long:"macaroonpath" description:"The full path to the single macaroon to use, either the admin.macaroon or a custom baked one. Cannot be specified at the same time as macaroondir. A custom macaroon must contain ALL permissions required for all subservers to work, otherwise permission errors will occur."`

	TLSPath string `long:"tlspath" description:"Path to lnd tls certificate"`
}

// swapClientServer implements the grpc service exposed by loopd.
type swapClientServer struct {
	// Required by the grpc-gateway/v2 library for forward compatibility.
	looprpc.UnimplementedSwapClientServer
	looprpc.UnimplementedDebugServer

	network          lndclient.Network
	impl             *loop.Client
	liquidityMgr     *liquidity.Manager
	lnd              *lndclient.LndServices
	swaps            map[lntypes.Hash]loop.SwapInfo
	subscribers      map[int]chan<- interface{}
	statusChan       chan loop.SwapInfo
	nextSubscriberID int
	swapsLock        sync.Mutex
	mainCtx          context.Context
}

// listenerCfg holds closures used to retrieve listeners for the gRPC services.
type listenerCfg struct {
	// grpcListener returns a TLS listener to use for the gRPC server, based
	// on the passed TLS configuration.
	grpcListener func(*tls.Config) (net.Listener, error)

	// restListener returns a TLS listener to use for the REST proxy, based
	// on the passed TLS configuration.
	restListener func(*tls.Config) (net.Listener, error)

	// getLnd returns a grpc connection to an lnd instance.
	getLnd func(lndclient.Network, *lndConfig) (*lndclient.GrpcLndServices,
		error)
}

// NewDaemon is used to create a new daemon that wraps a lightning
// network daemon. The user can provide an interceptor from
// another running lnd instance so they share it (nil otherwise.)
func NewLoop(log *zap.Logger, cfg *config.Loop, interceptor *signal.Interceptor) *Loop {

	return &Loop{
		cfg:         cfg,
		log:         log,
		loopStopped: true,
		loopRunning: 0,
		interceptor: interceptor,
	}
}

// Run starts the loop daemon and blocks until it's shut down again.
func (l *Loop) Start() error {
	l.startTime = time.Now()
	l.Lock()
	if !l.loopStopped {
		l.Unlock()
		return fmt.Errorf("loop must be stopped first")
	}

	config := loopd.DefaultConfig()

	// Validate our config before we proceed.
	if err := loopd.Validate(&config); err != nil {
		return err
	}

	// Initialize logging at the default logging level.
	logWriter, err := getLogWriter(l.cfg.LoopDir + "/data/chain/bitcoin/" + l.cfg.Network)
	if err != nil {
		l.log.Error("getLogWriter function returned with error", zap.String("err", err.Error()))
		return err
	}

	err = build.ParseAndSetDebugLevels(config.DebugLevel, logWriter)
	if err != nil {
		return err
	}
	/*
		oldArgs := os.Args
		defer func() { os.Args = oldArgs }()
		os.Args = []string{os.Args[0]}

		if err := loopd.Run(loopd.RPCConfig{}); err != nil {
			return fmt.Errorf("loopd exited with an error" + err.Error())
		} else {
			return nil
		}*/

	lisCfg := newListenerCfg(&config, *l.interceptor)
	daemon := loopd.New(&config, &lisCfg{})
	if err := daemon.Start(); err != nil {
		return err
	}

	select {
	case <-l.interceptor.ShutdownChannel():
		l.log.Info("Received SIGINT (Ctrl+C).")
		daemon.Stop()

		// The above stop will return immediately. But we'll be
		// notified on the error channel once the process is
		// complete.
		return <-daemon.ErrChan

	case err := <-daemon.ErrChan:
		return err
	}

}

// newListenerCfg creates and returns a new listenerCfg from the passed config
// and RPCConfig.
func newListenerCfg(config *loopd.Config, interceptor signal.Interceptor) *listenerCfg {
	return &listenerCfg{
		grpcListener: func(tlsCfg *tls.Config) (net.Listener, error) {

			listener, err := net.Listen("tcp", config.RPCListen)
			if err != nil {
				return nil, err
			}

			return tls.NewListener(listener, tlsCfg), nil
		},
		restListener: func(tlsCfg *tls.Config) (net.Listener, error) {
			listener, err := net.Listen("tcp", config.RESTListen)
			if err != nil {
				return nil, err
			}

			return tls.NewListener(listener, tlsCfg), nil
		},
		getLnd: func(network lndclient.Network, cfg *lndConfig) (
			*lndclient.GrpcLndServices, error) {

			callerCtx, cancel := context.WithCancel(
				context.Background(),
			)
			defer cancel()

			svcCfg := &lndclient.LndServicesConfig{
				LndAddress:            cfg.Host,
				Network:               network,
				CustomMacaroonPath:    cfg.MacaroonPath,
				TLSPath:               cfg.TLSPath,
				CheckVersion:          loopd.LoopMinRequiredLndVersion,
				BlockUntilChainSynced: true,
				CallerCtx:             callerCtx,
				BlockUntilUnlocked:    true,
			}

			// Before we try to get our client connection, setup
			// a goroutine which will cancel our lndclient if loopd
			// is terminated, or exit if our context is cancelled.
			go func() {
				select {
				// If the client decides to kill loop before
				// lnd is synced, we cancel our context, which
				// will unblock lndclient.
				case <-interceptor.ShutdownChannel():
					cancel()

				// If our sync context was cancelled, we know
				// that the function exited, which means that
				// our client synced.
				case <-callerCtx.Done():
				}
			}()

			// This will block until lnd is synced to chain.
			return lndclient.NewLndServices(svcCfg)
		},
	}
}

/*
// New creates a new instance of the loop client daemon.
func New(config *loopd.Config, lisCfg *listenerCfg) *Loop {
	return &Loop{
		// We send exactly one error on this channel if something goes
		// wrong at runtime. Or a nil value if the shutdown was
		// successful. But in case nobody's listening, we don't want to
		// block on it so we buffer it.
		ErrChan: make(chan error, 1),

		quit:        make(chan struct{}),
		cfg:         config,
		listenerCfg: lisCfg,

		// We have 4 goroutines that could potentially send an error.
		// We react on the first error but in case more than one exits
		// with an error we don't want them to block.
		internalErrChan: make(chan error, 4),
	}
}

// Start starts loopd in daemon mode. It will listen for grpc connections,
// execute commands and pass back swap status information.
func (l *Loop) Start2() error {

	// There should be no reason to start the daemon twice. Therefore return
	// an error if that's tried. This is mostly to guard against Start and
	// StartAsSubserver both being called.
	if atomic.AddInt32(&l.started, 1) != 1 {
		return errOnlyStartOnce
	}

	network := lndclient.Network(l.cfg.Network)

	var err error
	l.lnd, err = l.listenerCfg.getLnd(network, l.cfg.Lnd)
	if err != nil {
		return err
	}

	// With lnd connected, initialize everything else, such as the swap
	// server client, the swap client RPC server instance and our main swap
	// and error handlers. If this fails, then nothing has been started yet
	// and we can just return the error.
	err = l.initialize()
	if errors.Is(err, bbolt.ErrTimeout) {
		// We're trying to be started as a standalone Loop daemon, most
		// likely LiT is already running and blocking the DB
		return fmt.Errorf("%v: make sure no other loop daemon "+
			"process (standalone or embedded in "+
			"lightning-terminal) is running", err)
	}
	if err != nil {
		return err
	}

	// If we get here, we already have started several goroutines. So if
	// anything goes wrong now, we need to cleanly shut down again.
	startErr := d.startWebServers()
	if startErr != nil {
		log.Errorf("Error while starting daemon: %v", err)
		d.Stop()
		stopErr := <-d.ErrChan
		if stopErr != nil {
			log.Errorf("Error while stopping daemon: %v", stopErr)
		}
		return startErr
	}

	return nil
}

// StartAsSubserver is an alternative to Start where the RPC server does not
// create its own gRPC server but registers to an existing one. The same goes
// for REST (if enabled), instead of creating an own mux and HTTP server, we
// register to an existing one.
func (d *Daemon) StartAsSubserver(lndGrpc *lndclient.GrpcLndServices) error {
	// There should be no reason to start the daemon twice. Therefore return
	// an error if that's tried. This is mostly to guard against Start and
	// StartAsSubserver both being called.
	if atomic.AddInt32(&d.started, 1) != 1 {
		return errOnlyStartOnce
	}

	// When starting as a subserver, we get passed in an already established
	// connection to lnd that might be shared among other subservers.
	d.lnd = lndGrpc

	// With lnd already pre-connected, initialize everything else, such as
	// the swap server client, the RPC server instance and our main swap
	// handlers. If this fails, then nothing has been started yet and we can
	// just return the error.
	err := d.initialize()
	if errors.Is(err, bbolt.ErrTimeout) {
		// We're trying to be started inside LiT so there most likely is
		// another standalone Loop process blocking the DB.
		return fmt.Errorf("%v: make sure no other loop daemon "+
			"process is running", err)
	}
	return err
}

// ValidateMacaroon extracts the macaroon from the context's gRPC metadata,
// checks its signature, makes sure all specified permissions for the called
// method are contained within and finally ensures all caveat conditions are
// met. A non-nil error is returned if any of the checks fail. This method is
// needed to enable loopd running as an external subserver in the same process
// as lnd but still validate its own macaroons.
func (d *Daemon) ValidateMacaroon(ctx context.Context,
	requiredPermissions []bakery.Op, fullMethod string) error {

	// Delegate the call to loop's own macaroon validator service.
	return d.macaroonService.ValidateMacaroon(
		ctx, requiredPermissions, fullMethod,
	)
}

// startWebServers starts the gRPC and REST servers in goroutines.
func (d *Daemon) startWebServers() error {
	var err error

	// With our client created, let's now finish setting up and start our
	// RPC server. First we add the security interceptor to our gRPC server
	// options that checks the macaroons for validity.
	serverOpts, err := d.macaroonInterceptor()
	if err != nil {
		return fmt.Errorf("error with macaroon interceptor: %v", err)
	}
	d.grpcServer = grpc.NewServer(serverOpts...)
	looprpc.RegisterSwapClientServer(d.grpcServer, d)

	// Register our debug server if it is compiled in.
	d.registerDebugServer()

	// Next, start the gRPC server listening for HTTP/2 connections.
	log.Infof("Starting gRPC listener")
	serverTLSCfg, restClientCreds, err := getTLSConfig(d.cfg)
	if err != nil {
		return fmt.Errorf("could not create gRPC server options: %v",
			err)
	}
	d.grpcListener, err = d.listenerCfg.grpcListener(serverTLSCfg)
	if err != nil {
		return fmt.Errorf("RPC server unable to listen on %s: %v",
			d.cfg.RPCListen, err)
	}

	// The default JSON marshaler of the REST proxy only sets OrigName to
	// true, which instructs it to use the same field names as specified in
	// the proto file and not switch to camel case. What we also want is
	// that the marshaler prints all values, even if they are falsey.
	customMarshalerOption := proxy.WithMarshalerOption(
		proxy.MIMEWildcard, &proxy.JSONPb{
			MarshalOptions: protojson.MarshalOptions{
				UseProtoNames:   true,
				EmitUnpopulated: true,
			},
		},
	)

	// We'll also create and start an accompanying proxy to serve clients
	// through REST.
	ctx, cancel := context.WithCancel(context.Background())
	d.restCtxCancel = cancel
	mux := proxy.NewServeMux(customMarshalerOption)
	var restHandler http.Handler = mux
	if d.cfg.CORSOrigin != "" {
		restHandler = allowCORS(restHandler, d.cfg.CORSOrigin)
	}
	proxyOpts := []grpc.DialOption{
		grpc.WithTransportCredentials(*restClientCreds),
		grpc.WithDefaultCallOptions(maxMsgRecvSize),
	}

	// With TLS enabled by default, we cannot call 0.0.0.0 internally from
	// the REST proxy as that IP address isn't in the cert. We need to
	// rewrite it to the loopback address.
	restProxyDest := d.cfg.RPCListen
	switch {
	case strings.Contains(restProxyDest, "0.0.0.0"):
		restProxyDest = strings.Replace(
			restProxyDest, "0.0.0.0", "127.0.0.1", 1,
		)

	case strings.Contains(restProxyDest, "[::]"):
		restProxyDest = strings.Replace(
			restProxyDest, "[::]", "[::1]", 1,
		)
	}
	err = looprpc.RegisterSwapClientHandlerFromEndpoint(
		ctx, mux, restProxyDest, proxyOpts,
	)
	if err != nil {
		return err
	}

	d.restListener, err = d.listenerCfg.restListener(serverTLSCfg)
	if err != nil {
		return fmt.Errorf("REST proxy unable to listen on %s: %v",
			d.cfg.RESTListen, err)
	}

	// A nil listener indicates REST is disabled.
	if d.restListener != nil {
		log.Infof("Starting REST proxy listener")

		d.restServer = &http.Server{Handler: restHandler}

		d.wg.Add(1)
		go func() {
			defer d.wg.Done()

			log.Infof("REST proxy listening on %s",
				d.restListener.Addr())
			err := d.restServer.Serve(d.restListener)
			// ErrServerClosed is always returned when the proxy is
			// shut down, so don't log it.
			if err != nil && err != http.ErrServerClosed {
				// Notify the main error handler goroutine that
				// we exited unexpectedly here. We don't have to
				// worry about blocking as the internal error
				// channel is sufficiently buffered.
				d.internalErrChan <- err
			}
		}()
	} else {
		log.Infof("REST proxy disabled")
	}

	// Start the grpc server.
	d.wg.Add(1)
	go func() {
		defer d.wg.Done()

		log.Infof("RPC server listening on %s", d.grpcListener.Addr())
		err = d.grpcServer.Serve(d.grpcListener)
		if err != nil && err != grpc.ErrServerStopped {
			// Notify the main error handler goroutine that
			// we exited unexpectedly here. We don't have to
			// worry about blocking as the internal error
			// channel is sufficiently buffered.
			d.internalErrChan <- err
		}
	}()

	return nil
}

// initialize creates and initializes an instance of the swap server client,
// the swap client RPC server instance and our main swap and error handlers. If
// this method fails with an error then no goroutine was started yet and no
// cleanup is necessary. If it succeeds, then goroutines have been spawned.
func (l *Loop) initialize() error {
	// If no swap server is specified, use the default addresses for mainnet
	// and testnet.
	if l.cfg.Server.Host == "" {
		// TODO(wilmer): Use onion service addresses when proxy is
		// active.
		switch l.cfg.Network {
		case "mainnet":
			l.cfg.Server.Host = mainnetServer
		case "testnet":
			l.cfg.Server.Host = testnetServer
		default:
			return errors.New("no swap server address specified")
		}
	}

	// Create an instance of the loop client library.
	swapclient, clientCleanup, err := getClient(l.cfg, &l.lnd.LndServices)
	if err != nil {
		return err
	}
	l.clientCleanup = clientCleanup

	// Both the client RPC server and and the swap server client should
	// stop on main context cancel. So we create it early and pass it down.
	l.mainCtx, l.mainCtxCancel = context.WithCancel(context.Background())

	// Start the macaroon service and let it create its default macaroon in
	// case it doesn't exist yet.
	err = l.startMacaroonService()
	if err != nil {
		// The client is the only thing we started yet, so if we clean
		// up its connection now, nothing else needs to be shut down at
		// this point.
		clientCleanup()
		return err
	}

	// Now finally fully initialize the swap client RPC server instance.
	d.swapClientServer = swapClientServer{
		network:      lndclient.Network(d.cfg.Network),
		impl:         swapclient,
		liquidityMgr: getLiquidityManager(swapclient),
		lnd:          &d.lnd.LndServices,
		swaps:        make(map[lntypes.Hash]loop.SwapInfo),
		subscribers:  make(map[int]chan<- interface{}),
		statusChan:   make(chan loop.SwapInfo),
		mainCtx:      d.mainCtx,
	}

	// Retrieve all currently existing swaps from the database.
	swapsList, err := d.impl.FetchSwaps()
	if err != nil {
		// The client and the macaroon service are the only things we
		// started yet, so if we clean that up now, nothing else needs
		// to be shut down at this point.
		if err := d.stopMacaroonService(); err != nil {
			log.Errorf("Error shutting down macaroon service: %v",
				err)
		}
		clientCleanup()
		return err
	}

	for _, s := range swapsList {
		d.swaps[s.SwapHash] = *s
	}

	// Start the swap client itself.
	d.wg.Add(1)
	go func() {
		defer d.wg.Done()

		log.Infof("Starting swap client")
		err := d.impl.Run(d.mainCtx, d.statusChan)
		if err != nil {
			// Notify the main error handler goroutine that
			// we exited unexpectedly here. We don't have to
			// worry about blocking as the internal error
			// channel is sufficiently buffered.
			d.internalErrChan <- err
		}
		log.Infof("Swap client stopped")
	}()

	// Start a goroutine that broadcasts swap updates to clients.
	d.wg.Add(1)
	go func() {
		defer d.wg.Done()

		log.Infof("Waiting for updates")
		d.processStatusUpdates(d.mainCtx)
	}()

	d.wg.Add(1)
	go func() {
		defer d.wg.Done()

		log.Info("Starting liquidity manager")
		err := d.liquidityMgr.Run(d.mainCtx)
		if err != nil && err != context.Canceled {
			d.internalErrChan <- err
		}

		log.Info("Liquidity manager stopped")
	}()

	// Last, start our internal error handler. This will return exactly one
	// error or nil on the main error channel to inform the caller that
	// something went wrong or that shutdown is complete. We don't add to
	// the wait group here because this goroutine will itself wait for the
	// stop to complete and signal its completion through the main error
	// channel.
	go func() {
		var runtimeErr error

		// There are only two ways this goroutine can exit. Either there
		// is an internal error or the caller requests shutdown. In both
		// cases we wait for the stop to complete before we signal the
		// caller that we're done.
		select {
		case runtimeErr = <-d.internalErrChan:
			log.Errorf("Runtime error in daemon, shutting down: "+
				"%v", runtimeErr)

		case <-d.quit:
		}

		// We need to shutdown before sending the error on the channel,
		// otherwise a caller might exit the process too early.
		d.stop()
		log.Info("Daemon exited")

		// The caller expects exactly one message. So we send the error
		// even if it's nil because we cleanly shut down.
		d.ErrChan <- runtimeErr
	}()

	return nil
}

// Stop tries to gracefully shut down the daemon. A caller needs to wait for a
// message on the main error channel indicating that the shutdown is completed.
func (d *Daemon) Stop() {
	d.stopOnce.Do(func() {
		close(d.quit)
	})
}

// stop does the actual shutdown and blocks until all goroutines have exit.
func (l *Loop) stop() {
	// First of all, we can cancel the main context that all event handlers
	// are using. This should stop all swap activity and all event handlers
	// should exit.
	if d.mainCtxCancel != nil {
		d.mainCtxCancel()
	}

	// As there is no swap activity anymore, we can forcefully shutdown the
	// gRPC and HTTP servers now.
	log.Infof("Stopping gRPC server")
	if d.grpcServer != nil {
		d.grpcServer.Stop()
	}
	log.Infof("Stopping REST server")
	if d.restServer != nil {
		// Don't return the error here, we first want to give everything
		// else a chance to shut down cleanly.
		err := d.restServer.Close()
		if err != nil {
			log.Errorf("Error stopping REST server: %v", err)
		}
	}
	if d.restCtxCancel != nil {
		d.restCtxCancel()
	}

	err := d.macaroonService.Close()
	if err != nil {
		log.Errorf("Error stopping macaroon service: %v", err)
	}

	// Next, shut down the connections to lnd and the swap server.
	if d.lnd != nil {
		d.lnd.Close()
	}
	if d.clientCleanup != nil {
		d.clientCleanup()
	}

	// Everything should be shutting down now, wait for completion.
	d.wg.Wait()
}

// allowCORS wraps the given http.Handler with a function that adds the
// Access-Control-Allow-Origin header to the response.
func allowCORS(handler http.Handler, origin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		handler.ServeHTTP(w, r)
	})
}

// getClient returns an instance of the swap client.
func getClient(config *loopd.Config, lnd *lndclient.LndServices) (*loop.Client,
	func(), error) {

	clientConfig := &loop.ClientConfig{
		ServerAddress:   config.Server.Host,
		ProxyAddress:    config.Server.Proxy,
		SwapServerNoTLS: config.Server.NoTLS,
		TLSPathServer:   config.Server.TLSPath,
		Lnd:             lnd,
		MaxLsatCost:     btcutil.Amount(config.MaxLSATCost),
		MaxLsatFee:      btcutil.Amount(config.MaxLSATFee),
		LoopOutMaxParts: config.LoopOutMaxParts,
	}

	swapClient, cleanUp, err := loop.NewClient(config.DataDir, clientConfig)
	if err != nil {
		return nil, nil, err
	}

	return swapClient, cleanUp, nil
}
*/
