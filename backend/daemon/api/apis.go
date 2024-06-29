package api

import (
	"context"
	"fmt"
	"seed/backend/core"
	accounts "seed/backend/daemon/api/accounts/v1alpha"
	activity "seed/backend/daemon/api/activity/v1alpha"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	documents "seed/backend/daemon/api/documents/v1alpha"
	documentsv2 "seed/backend/daemon/api/documents/v2alpha"
	entities "seed/backend/daemon/api/entities/v1alpha"
	networking "seed/backend/daemon/api/networking/v1alpha"
	"seed/backend/daemon/index"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/mttnet"
	"seed/backend/pkg/future"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc"
)

// Server combines all the daemon API services into one thing.
type Server struct {
	Accounts    *accounts.Server
	Daemon      *daemon.Server
	Documents   *documents.Server
	Networking  *networking.Server
	Entities    *entities.Server
	Activity    *activity.Server
	DocumentsV2 *documentsv2.Server
}

type Storage interface {
	DB() *sqlitex.Pool
	KeyStore() core.KeyStore
	Migrate() error
	Device() core.KeyPair
}

// New creates a new API server.
func New(
	ctx context.Context,
	repo Storage,
	db *sqlitex.Pool,
	blobs *hyper.Storage,
	node *mttnet.Node,
	wallet daemon.Wallet,
	LogLevel string,
) Server {
	doSync := func() error {
		return fmt.Errorf("TODO(hm24): implement forced syncing")
	}

	idx := index.NewIndex(db, logging.New("seed/index", LogLevel))

	documentsSrv := documents.NewServer(repo.KeyStore(), db,
		nil, // TODO(hm24): add discovery back
		nil, // TODO(hm24): add gateway client back
		LogLevel)
	return Server{
		Accounts:    accounts.NewServer(repo.KeyStore(), blobs),
		Activity:    activity.NewServer(db),
		Daemon:      daemon.NewServer(repo, blobs, wallet, doSync),
		Documents:   documentsSrv,
		Networking:  networking.NewServer(blobs, node),
		Entities:    entities.NewServer(blobs, &lazyDiscoverer{}),
		DocumentsV2: documentsv2.NewServer(repo.KeyStore(), idx),
	}
}

// Register API services on the given gRPC server.
func (s Server) Register(srv *grpc.Server) {
	s.Accounts.RegisterServer(srv)
	s.Daemon.RegisterServer(srv)
	s.Documents.RegisterServer(srv)
	s.Activity.RegisterServer(srv)
	s.Networking.RegisterServer(srv)
	s.Entities.RegisterServer(srv)
	s.DocumentsV2.RegisterServer(srv)
}

type lazyGwClient struct {
	net *future.ReadOnly[*mttnet.Node]
}

// Connect connects to a remote gateway. Necessary here for the grpc server to add a site
// that needs to connect to the site under the hood.
func (ld *lazyGwClient) GatewayClient(ctx context.Context, url string) (mttnet.GatewayClient, error) {
	node, ok := ld.net.Get()
	if !ok {
		return nil, fmt.Errorf("p2p node is not yet initialized")
	}
	return node.GatewayClient(ctx, url)
}

type lazyDiscoverer struct {
	net *future.ReadOnly[*mttnet.Node]
}

// DiscoverObject attempts to discover a given Seed Object with an optional version specified.
// If no version is specified it tries to find whatever is possible.
func (ld *lazyDiscoverer) DiscoverObject(ctx context.Context, obj hyper.EntityID, v hyper.Version) error {
	return fmt.Errorf("TODO(hm24): implement discovery")

	// svc, err := ld.sync.Await(ctx)
	// if err != nil {
	// 	return err
	// }

	// return svc.DiscoverObject(ctx, obj, v)
}

// ProvideCID notifies the providing system to provide the given CID on the DHT.
func (ld *lazyDiscoverer) ProvideCID(c cid.Cid) error {
	node, ok := ld.net.Get()
	if !ok {
		return fmt.Errorf("p2p node is not yet initialized")
	}

	return node.ProvideCID(c)
}

// Connect connects to a remote peer. Necessary here for the grpc server to add a site
// that needs to connect to the site under the hood.
func (ld *lazyDiscoverer) Connect(ctx context.Context, peerInfo peer.AddrInfo) error {
	node, ok := ld.net.Get()
	if !ok {
		return fmt.Errorf("p2p node is not yet initialized")
	}
	return node.Connect(ctx, peerInfo)
}

// Connect connects to a remote peer. Necessary here for the grpc server to add a site
// that needs to connect to the site under the hood.
func (ld *lazyDiscoverer) SyncWithPeer(ctx context.Context, deviceID peer.ID) error {
	return fmt.Errorf("TODO(hm24): implement sync with peer")

	// svc, ok := ld.sync.Get()
	// if !ok {
	// 	return fmt.Errorf("sync not ready yet")
	// }

	// return svc.SyncWithPeer(ctx, deviceID)
}
