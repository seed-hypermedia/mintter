package lndclient

import (
	"context"
	"errors"
	"fmt"
	"net"
	"path/filepath"
	"strings"
	"time"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcutil"
	"github.com/lightningnetwork/lnd/lncfg"
	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/verrpc"
	"github.com/lightningnetwork/lnd/routing/route"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/status"
)

var (
	// defaultRPCTimeout is the default timeout used for rpc calls.
	defaultRPCTimeout = 30 * time.Second

	// chainSyncPollInterval is the interval in which we poll the GetInfo
	// call to find out if lnd is fully synced to its chain backend.
	chainSyncPollInterval = 5 * time.Second

	// minimalCompatibleVersion is the minimum version and build tags
	// required in lnd to get all functionality implemented in lndclient.
	// Users can provide their own, specific version if needed. If only a
	// subset of the lndclient functionality is needed, the required build
	// tags can be adjusted accordingly. This default will be used as a fall
	// back version if none is specified in the configuration.
	minimalCompatibleVersion = &verrpc.Version{
		AppMajor:  0,
		AppMinor:  13,
		AppPatch:  0,
		BuildTags: DefaultBuildTags,
	}

	// ErrVersionCheckNotImplemented is the error that is returned if the
	// version RPC is not implemented in lnd. This means the version of lnd
	// is lower than v0.10.0-beta.
	ErrVersionCheckNotImplemented = errors.New("version check not " +
		"implemented, need minimum lnd version of v0.10.0-beta")

	// ErrVersionIncompatible is the error that is returned if the connected
	// lnd instance is not supported.
	ErrVersionIncompatible = errors.New("version incompatible")

	// ErrBuildTagsMissing is the error that is returned if the
	// connected lnd instance does not have all built tags activated that
	// are required.
	ErrBuildTagsMissing = errors.New("build tags missing")

	// DefaultBuildTags is the list of all subserver build tags that are
	// required for lndclient to work.
	DefaultBuildTags = []string{
		"signrpc", "walletrpc", "chainrpc", "invoicesrpc",
	}

	// lnd13UnlockErrors is the list of errors that lnd 0.13 and later
	// returns when the wallet is locked or not ready yet.
	lnd13UnlockErrors = []string{
		"waiting to start, RPC services not available",
		"wallet not created, create one to enable full RPC access",
		"wallet locked, unlock it to enable full RPC access",
		"the RPC server is in the process of starting up, but not " +
			"yet ready to accept calls",
	}
)

// LndServicesConfig holds all configuration settings that are needed to connect
// to an lnd node.
type LndServicesConfig struct {
	// LndAddress is the network address (host:port) of the lnd node to
	// connect to.
	LndAddress string

	// Network is the bitcoin network we expect the lnd node to operate on.
	Network Network

	// MacaroonDir is the directory where all lnd macaroons can be found.
	// Either this or CustomMacaroonPath can be specified but not both.
	MacaroonDir string

	// CustomMacaroonPath is the full path to a custom macaroon file. Either
	// this or MacaroonDir can be specified but not both.
	CustomMacaroonPath string

	// TLSPath is the path to lnd's TLS certificate file.
	TLSPath string

	// CheckVersion is the minimum version the connected lnd node needs to
	// be in order to be compatible. The node will be checked against this
	// when connecting. If no version is supplied, the default minimum
	// version will be used.
	CheckVersion *verrpc.Version

	// Dialer is an optional dial function that can be passed in if the
	// default lncfg.ClientAddressDialer should not be used.
	Dialer DialerFunc

	// BlockUntilChainSynced denotes that the NewLndServices function should
	// block until the lnd node is fully synced to its chain backend. This
	// can take a long time if lnd was offline for a while or if the initial
	// block download is still in progress.
	BlockUntilChainSynced bool

	// BlockUntilUnlocked denotes that the NewLndServices function should
	// block until lnd is unlocked.
	BlockUntilUnlocked bool

	// CallerCtx is an optional context that can be passed if the caller
	// would like to be able to cancel the long waits involved in starting
	// up the client, such as waiting for chain sync to complete when
	// BlockUntilChainSynced is set to true, or waiting for lnd to be
	// unlocked when BlockUntilUnlocked is set to true. If a context is
	// passed in and its Done() channel sends a message, these waits will
	// be aborted. This allows a client to still be shut down properly.
	CallerCtx context.Context

	// RPCTimeout is an optional custom timeout that will be used for rpc
	// calls to lnd. If this value is not set, it will default to 30
	// seconds.
	RPCTimeout time.Duration
}

// DialerFunc is a function that is used as grpc.WithContextDialer().
type DialerFunc func(context.Context, string) (net.Conn, error)

// LndServices constitutes a set of required services.
type LndServices struct {
	Client        LightningClient
	WalletKit     WalletKitClient
	ChainNotifier ChainNotifierClient
	Signer        SignerClient
	Invoices      InvoicesClient
	Router        RouterClient
	Versioner     VersionerClient
	State         StateClient

	ChainParams *chaincfg.Params
	NodeAlias   string
	NodePubkey  route.Vertex
	Version     *verrpc.Version

	macaroons macaroonPouch
}

// GrpcLndServices constitutes a set of required RPC services.
type GrpcLndServices struct {
	LndServices

	cleanup func()
}

// NewLndServices creates creates a connection to the given lnd instance and
// creates a set of required RPC services.
func NewLndServices(cfg *LndServicesConfig) (*GrpcLndServices, error) {
	// We need to use a custom dialer so we can also connect to unix
	// sockets and not just TCP addresses.
	if cfg.Dialer == nil {
		cfg.Dialer = lncfg.ClientAddressDialer(defaultRPCPort)
	}

	// Fall back to minimal compatible version if none if specified.
	if cfg.CheckVersion == nil {
		cfg.CheckVersion = minimalCompatibleVersion
	}

	// We don't allow setting both the macaroon directory and the custom
	// macaroon path. If both are empty, that's fine, the default behavior
	// is to use lnd's default directory to try to locate the macaroons.
	if cfg.MacaroonDir != "" && cfg.CustomMacaroonPath != "" {
		return nil, fmt.Errorf("must set either MacaroonDir or " +
			"CustomMacaroonPath but not both")
	}

	// Based on the network, if the macaroon directory isn't set, then
	// we'll use the expected default locations.
	macaroonDir := cfg.MacaroonDir
	if macaroonDir == "" {
		switch cfg.Network {
		case NetworkTestnet:
			macaroonDir = filepath.Join(
				defaultLndDir, defaultDataDir,
				defaultChainSubDir, "bitcoin", "testnet",
			)

		case NetworkMainnet:
			macaroonDir = filepath.Join(
				defaultLndDir, defaultDataDir,
				defaultChainSubDir, "bitcoin", "mainnet",
			)

		case NetworkSimnet:
			macaroonDir = filepath.Join(
				defaultLndDir, defaultDataDir,
				defaultChainSubDir, "bitcoin", "simnet",
			)

		case NetworkRegtest:
			macaroonDir = filepath.Join(
				defaultLndDir, defaultDataDir,
				defaultChainSubDir, "bitcoin", "regtest",
			)

		default:
			return nil, fmt.Errorf("unsupported network: %v",
				cfg.Network)
		}
	}

	// Setup connection with lnd
	log.Infof("Creating lnd connection to %v", cfg.LndAddress)
	conn, err := getClientConn(cfg)
	if err != nil {
		return nil, err
	}

	log.Infof("Connected to lnd")

	chainParams, err := cfg.Network.ChainParams()
	if err != nil {
		return nil, err
	}

	// We are going to check that the connected lnd is on the same network
	// and is a compatible version with all the required subservers enabled.
	// For this, we make two calls, both of which only need the readonly
	// macaroon. We don't use the pouch yet because if not all subservers
	// are enabled, then not all macaroons might be there and the user would
	// get a more cryptic error message.
	readonlyMac, err := loadMacaroon(
		macaroonDir, readonlyMacFilename, cfg.CustomMacaroonPath,
	)
	if err != nil {
		return nil, err
	}

	timeout := defaultRPCTimeout
	if cfg.RPCTimeout != 0 {
		timeout = cfg.RPCTimeout
	}

	basicClient := lnrpc.NewLightningClient(conn)
	stateClient := newStateClient(conn, readonlyMac)
	versionerClient := newVersionerClient(conn, readonlyMac, timeout)

	cleanupConn := func() {
		closeErr := conn.Close()
		if closeErr != nil {
			log.Errorf("Error closing lnd connection: %v", closeErr)
		}
	}

	// Get lnd's info, blocking until lnd is unlocked if required.
	info, err := getLndInfo(
		cfg.CallerCtx, basicClient, readonlyMac, stateClient,
		cfg.BlockUntilUnlocked,
	)
	if err != nil {
		cleanupConn()
		return nil, err
	}

	nodeAlias, nodeKey, version, err := checkLndCompatibility(
		conn, readonlyMac, info, cfg.Network, cfg.CheckVersion, timeout,
	)
	if err != nil {
		cleanupConn()
		return nil, err
	}

	// Now that we've ensured our macaroon directory is set properly, we
	// can retrieve our full macaroon pouch from the directory.
	macaroons, err := newMacaroonPouch(macaroonDir, cfg.CustomMacaroonPath)
	if err != nil {
		cleanupConn()
		return nil, fmt.Errorf("unable to obtain macaroons: %v", err)
	}

	// With the macaroons loaded and the version checked, we can now create
	// the real lightning client which uses the admin macaroon.
	lightningClient := newLightningClient(
		conn, timeout, chainParams, macaroons[adminMacFilename],
	)

	// With the network check passed, we'll now initialize the rest of the
	// sub-server connections, giving each of them their specific macaroon.
	notifierClient := newChainNotifierClient(
		conn, macaroons[chainMacFilename], timeout,
	)
	signerClient := newSignerClient(
		conn, macaroons[signerMacFilename], timeout,
	)
	walletKitClient := newWalletKitClient(
		conn, macaroons[walletKitMacFilename], timeout,
	)
	invoicesClient := newInvoicesClient(
		conn, macaroons[invoiceMacFilename], timeout,
	)
	routerClient := newRouterClient(
		conn, macaroons[routerMacFilename], timeout,
	)

	cleanup := func() {
		log.Debugf("Closing lnd connection")
		cleanupConn()

		log.Debugf("Wait for client to finish")
		lightningClient.WaitForFinished()

		log.Debugf("Wait for chain notifier to finish")
		notifierClient.WaitForFinished()

		log.Debugf("Wait for invoices to finish")
		invoicesClient.WaitForFinished()

		log.Debugf("Lnd services finished")
	}

	services := &GrpcLndServices{
		LndServices: LndServices{
			Client:        lightningClient,
			WalletKit:     walletKitClient,
			ChainNotifier: notifierClient,
			Signer:        signerClient,
			Invoices:      invoicesClient,
			Router:        routerClient,
			Versioner:     versionerClient,
			ChainParams:   chainParams,
			NodeAlias:     nodeAlias,
			NodePubkey:    route.Vertex(nodeKey),
			Version:       version,
			macaroons:     macaroons,
		},
		cleanup: cleanup,
	}

	log.Infof("Using network %v", cfg.Network)

	// If requested in the configuration, we now wait for lnd to fully sync
	// to its chain backend. We do not add any timeout as it would be hard
	// to determine a sane value. If the initial block download is still in
	// progress, this could take hours.
	if cfg.BlockUntilChainSynced {
		log.Infof("Waiting for lnd to be fully synced to its chain " +
			"backend, this might take a while")

		err := services.waitForChainSync(cfg.CallerCtx, timeout)
		if err != nil {
			cleanup()
			return nil, fmt.Errorf("error waiting for chain to "+
				"be synced: %v", err)
		}

		log.Infof("lnd is now fully synced to its chain backend")
	}

	return services, nil
}

// Close closes the lnd connection and waits for all sub server clients to
// finish their goroutines.
func (s *GrpcLndServices) Close() {
	s.cleanup()

	log.Debugf("Lnd services finished")
}

// waitForChainSync waits and blocks until the connected lnd node is fully
// synced to its chain backend. This could theoretically take hours if the
// initial block download is still in progress.
func (s *GrpcLndServices) waitForChainSync(ctx context.Context,
	timeout time.Duration) error {

	mainCtx := ctx
	if mainCtx == nil {
		mainCtx = context.Background()
	}

	// We spawn a goroutine that polls in regular intervals and reports back
	// once the chain is ready (or something went wrong). If the chain is
	// already synced, this should return almost immediately.
	update := make(chan error)
	go func() {
		for {
			// The GetInfo call can take a while. But if it takes
			// too long, that can be a sign of something being wrong
			// with the node. That's why we don't wait any longer
			// than a few seconds for each individual GetInfo call.
			ctxt, cancel := context.WithTimeout(mainCtx, timeout)
			info, err := s.Client.GetInfo(ctxt)
			if err != nil {
				cancel()
				update <- fmt.Errorf("error in GetInfo call: "+
					"%v", err)
				return
			}
			cancel()

			// We're done, deliver a nil update by closing the chan.
			if info.SyncedToChain {
				close(update)
				return
			}

			select {
			// If we're not yet done, let's now wait a few seconds.
			case <-time.After(chainSyncPollInterval):

			// If the user cancels the context, we should also
			// abort the wait.
			case <-mainCtx.Done():
				update <- mainCtx.Err()
				return
			}
		}
	}()

	// Wait for either an error or the nil close signal to arrive.
	return <-update
}

// getLndInfo queries lnd for information about the node it is connected to.
// If the waitForUnlocked boolean is set, it will examine any errors returned
// and back off if the failure is due to lnd currently being locked. Otherwise,
// it will fail fast on any errors returned. We use the raw ln client so that
// we can set specific grpc options we need to wait for lnd to be ready.
func getLndInfo(ctx context.Context, basicClient lnrpc.LightningClient,
	readonlyMac serializedMacaroon, stateClient StateClient,
	waitForUnlocked bool) (*Info, error) {

	if ctx == nil {
		ctx = context.Background()
	}

	// We expect the initial connection to already have succeeded. So we
	// know lnd is responding. Therefore we can now just subscribe to the
	// state update RPC. With the new unified unlocker RPC the server
	// shouldn't shut down/close on us during the unlocking phase.
	//
	// All we have to do is to interpret the states that lnd could be in
	// during the unlock:
	// Locked: lnd is currently locked or no wallet exist
	//   -> WalletStateNonExisting, WalletStateLocked
	// Unlocking: lnd has just been unlocked, -> WalletStateUnlocked
	// Unlocked, ok: lnd is unlocked and ready
	//   -> WalletStateRPCActive
	// Unlocked, not ok: lnd is unlocked but in bad state, err
	stateChan, errChan, err := stateClient.SubscribeState(ctx)
	if err != nil {
		// Because we're expecting lnd to be at least version 0.13 here
		// we would get an "Unimplemented" error here if it's a previous
		// version and the node is locked. Since the actual version
		// compatibility check only runs after this check, we want to
		// print at least a somewhat useful error message here.
		if IsUnlockError(err) {
			err = fmt.Errorf("lnd version incompatible, need "+
				"at least v0.13.0-beta, got error on "+
				"state subscription: %w", err)
		}

		return nil, fmt.Errorf("error subscribing to lnd wallet "+
			"state: %w", err)
	}

	getInfo := func() (*Info, error) {
		// We've made a connection and (possibly) unlocked lnd. All that
		// is left to do is to query and return the node information.
		info, err := basicClient.GetInfo(
			readonlyMac.WithMacaroonAuth(ctx),
			&lnrpc.GetInfoRequest{},
		)
		if err != nil {
			return nil, err
		}

		return newInfo(info)
	}

	// If we don't want to wait for the unlock we exit the function early
	// and will try to return the node info below. This could fail if the
	// node is indeed still locked so this flag doesn't make a lot of sense
	// anymore...
	if !waitForUnlocked {
		return getInfo()
	}

	// If we do want to wait for the unlock, we need to consume the state
	// updates now.
	log.Info("Waiting for lnd to unlock")
	for {
		select {
		case state := <-stateChan:
			log.Infof("Wallet state of lnd is now: %v", state)

			// Once we reach the final state we can break out of the
			// loop.
			if state == WalletStateRPCActive {
				return getInfo()
			}

		case err := <-errChan:
			log.Errorf("Error while waiting for lnd to be "+
				"unlocked: %v", err)
			return nil, err

		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
}

// IsUnlockError returns true if the given error is one that lnd returns when
// its wallet is locked, either before version 0.13 or after.
func IsUnlockError(err error) bool {
	if err == nil {
		return false
	}

	// Is the error one that lnd 0.13 returns when it's locked?
	errStr := err.Error()
	for _, lnd13Err := range lnd13UnlockErrors {
		if strings.Contains(errStr, lnd13Err) {
			return true
		}
	}

	// If we do not get a rpc error code, something else is wrong with the
	// call, so we fail.
	rpcErrorCode, ok := status.FromError(err)
	if !ok {
		return false
	}

	// Unimplemented means we're hitting the GetInfo RPC while the wallet
	// unlocker RPC is still up. Unavailable can be returned in the short
	// window of time while the unlocker shuts down and the main RPC server
	// is started.
	if rpcErrorCode.Code() == codes.Unimplemented ||
		rpcErrorCode.Code() == codes.Unavailable {

		return true
	}

	return false
}

// checkLndCompatibility makes sure the connected lnd instance is running on the
// correct network, has the version RPC implemented, is the correct minimal
// version and supports all required build tags/subservers.
func checkLndCompatibility(conn grpc.ClientConnInterface,
	readonlyMac serializedMacaroon, info *Info, network Network,
	minVersion *verrpc.Version, timeout time.Duration) (string,
	[33]byte, *verrpc.Version, error) {

	// onErr is a closure that simplifies returning multiple values in the
	// error case.
	onErr := func(err error) (string, [33]byte, *verrpc.Version, error) {
		// Make static error messages a bit less cryptic by adding the
		// version or build tag that we expect.
		newErr := fmt.Errorf("lnd compatibility check failed: %v", err)
		if err == ErrVersionIncompatible || err == ErrBuildTagsMissing {
			newErr = fmt.Errorf("error checking connected lnd "+
				"version. at least version \"%s\" is "+
				"required", VersionString(minVersion))
		}

		return "", [33]byte{}, nil, newErr
	}

	// Ensure that the network for lnd matches our expected network.
	if string(network) != info.Network {
		err := fmt.Errorf("network mismatch with connected lnd node, "+
			"wanted '%s', got '%s'", network, info.Network)
		return onErr(err)
	}

	// We use our own clients with a readonly macaroon here, because we know
	// that's all we need for the checks.
	versionerClient := newVersionerClient(conn, readonlyMac, timeout)

	// Now let's also check the version of the connected lnd node.
	version, err := checkVersionCompatibility(versionerClient, minVersion)
	if err != nil {
		return onErr(err)
	}

	// Return the static part of the info we just queried from the node so
	// it can be cached for later use.
	return info.Alias, info.IdentityPubkey, version, nil
}

// checkVersionCompatibility makes sure the connected lnd node has the correct
// version and required build tags enabled.
//
// NOTE: This check will **never** return a non-nil error for a version of
// lnd < 0.10.0 because any version previous to 0.10.0 doesn't have the version
// endpoint implemented!
func checkVersionCompatibility(client VersionerClient,
	expected *verrpc.Version) (*verrpc.Version, error) {

	// First, test that the version RPC is even implemented.
	version, err := client.GetVersion(context.Background())
	if err != nil {
		// The version service has only been added in lnd v0.10.0. If
		// we get an unimplemented error, it means the lnd version is
		// definitely older than that.
		s, ok := status.FromError(err)
		if ok && s.Code() == codes.Unimplemented {
			return nil, ErrVersionCheckNotImplemented
		}
		return nil, fmt.Errorf("GetVersion error: %v", err)
	}

	log.Infof("lnd version: %v", VersionString(version))

	// Now check the version and make sure all required build tags are set.
	err = assertVersionCompatible(version, expected)
	if err != nil {
		return nil, err
	}
	err = assertBuildTagsEnabled(version, expected.BuildTags)
	if err != nil {
		return nil, err
	}

	// All check positive, version is fully compatible.
	return version, nil
}

// assertVersionCompatible makes sure the detected lnd version is compatible
// with our current version requirements.
func assertVersionCompatible(actual *verrpc.Version,
	expected *verrpc.Version) error {

	// We need to check the versions parts sequentially as they are
	// hierarchical.
	if actual.AppMajor != expected.AppMajor {
		if actual.AppMajor > expected.AppMajor {
			return nil
		}
		return ErrVersionIncompatible
	}

	if actual.AppMinor != expected.AppMinor {
		if actual.AppMinor > expected.AppMinor {
			return nil
		}
		return ErrVersionIncompatible
	}

	if actual.AppPatch != expected.AppPatch {
		if actual.AppPatch > expected.AppPatch {
			return nil
		}
		return ErrVersionIncompatible
	}

	// The actual version and expected version are identical.
	return nil
}

// assertBuildTagsEnabled makes sure all required build tags are set.
func assertBuildTagsEnabled(actual *verrpc.Version,
	requiredTags []string) error {

	tagMap := make(map[string]struct{})
	for _, tag := range actual.BuildTags {
		tagMap[tag] = struct{}{}
	}
	for _, required := range requiredTags {
		if _, ok := tagMap[required]; !ok {
			return ErrBuildTagsMissing
		}
	}

	// All tags found.
	return nil
}

var (
	defaultRPCPort         = "10009"
	defaultLndDir          = btcutil.AppDataDir("lnd", false)
	defaultTLSCertFilename = "tls.cert"
	defaultTLSCertPath     = filepath.Join(
		defaultLndDir, defaultTLSCertFilename,
	)
	defaultDataDir     = "data"
	defaultChainSubDir = "chain"

	adminMacFilename     = "admin.macaroon"
	invoiceMacFilename   = "invoices.macaroon"
	chainMacFilename     = "chainnotifier.macaroon"
	walletKitMacFilename = "walletkit.macaroon"
	routerMacFilename    = "router.macaroon"
	signerMacFilename    = "signer.macaroon"
	readonlyMacFilename  = "readonly.macaroon"

	// maxMsgRecvSize is the largest gRPC message our client will receive.
	// We set this to 200MiB.
	maxMsgRecvSize = grpc.MaxCallRecvMsgSize(1 * 1024 * 1024 * 200)
)

func getClientConn(cfg *LndServicesConfig) (*grpc.ClientConn, error) {
	// Load the specified TLS certificate and build transport credentials
	// with it.
	tlsPath := cfg.TLSPath
	if tlsPath == "" {
		tlsPath = defaultTLSCertPath
	}

	creds, err := credentials.NewClientTLSFromFile(tlsPath, "")
	if err != nil {
		return nil, err
	}

	// Create a dial options array.
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(creds),

		// Use a custom dialer, to allow connections to unix sockets,
		// in-memory listeners etc, and not just TCP addresses.
		grpc.WithContextDialer(cfg.Dialer),
		grpc.WithDefaultCallOptions(maxMsgRecvSize),
	}

	conn, err := grpc.Dial(cfg.LndAddress, opts...)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to RPC server: %v",
			err)
	}

	return conn, nil
}
