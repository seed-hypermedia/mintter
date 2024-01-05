package api

import (
	"context"
	"fmt"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	documents "mintter/backend/daemon/api/documents/v1alpha"
	entities "mintter/backend/daemon/api/entities/v1alpha"
	groups "mintter/backend/daemon/api/groups/v1alpha"
	networking "mintter/backend/daemon/api/networking/v1alpha"
	"mintter/backend/daemon/storage"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/syncing"
	"mintter/backend/wallet"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
)

// Server combines all the daemon API services into one thing.
type Server struct {
	Accounts   *accounts.Server
	Daemon     *daemon.Server
	Documents  *documents.Server
	Networking *networking.Server
	Entities   *entities.Server
	Groups     *groups.Server
}

// New creates a new API server.
func New(
	ctx context.Context,
	repo *storage.Dir,
	db *sqlitex.Pool,
	blobs *hyper.Storage,
	node *future.ReadOnly[*mttnet.Node],
	sync *future.ReadOnly[*syncing.Service],
	wallet *wallet.Service,
	LogLevel string,
) Server {
	doSync := func() error {
		s, ok := sync.Get()
		if !ok {
			return fmt.Errorf("account is not initialized yet")
		}

		go func() {
			if err := s.SyncAndLog(ctx); err != nil {
				panic("bug or fatal error during sync " + err.Error())
			}
		}()

		return nil
	}

	documentsSrv := documents.NewServer(repo.Identity(), db, &lazyDiscoverer{sync: sync, net: node}, &lazyGwClient{net: node}, LogLevel)
	return Server{
		Accounts:   accounts.NewServer(repo.Identity(), blobs),
		Daemon:     daemon.NewServer(repo, blobs, wallet, doSync),
		Documents:  documentsSrv,
		Networking: networking.NewServer(blobs, node),
		Entities:   entities.NewServer(blobs, &lazyDiscoverer{sync: sync}),
		Groups:     groups.NewServer(repo.Identity(), logging.New("mintter/groups", LogLevel), groups.NewSQLiteDB(db), blobs, node),
	}
}

type lazyGwClient struct {
	net *future.ReadOnly[*mttnet.Node]
}

// Connect connects to a remote gateway. Necessary here for the grpc server to add a site
// that needs to connect to the site under the hood.
func (ld *lazyGwClient) GatewayClient(ctx context.Context) (mttnet.GatewayClient, error) {
	node, ok := ld.net.Get()
	if !ok {
		return nil, fmt.Errorf("p2p node is not yet initialized")
	}
	return node.GatewayClient(ctx)
}

type lazyDiscoverer struct {
	sync *future.ReadOnly[*syncing.Service]
	net  *future.ReadOnly[*mttnet.Node]
}

// DiscoverObject attempts to discover a given Mintter Object with an optional version specified.
// If no version is specified it tries to find whatever is possible.
func (ld *lazyDiscoverer) DiscoverObject(ctx context.Context, obj hyper.EntityID, v hyper.Version) error {
	svc, err := ld.sync.Await(ctx)
	if err != nil {
		return err
	}

	return svc.DiscoverObject(ctx, obj, v)
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
func (ld *lazyDiscoverer) SyncWithPeer(ctx context.Context, deviceID peer.ID, initialObjects ...hyper.EntityID) error {
	svc, ok := ld.sync.Get()
	if !ok {
		return fmt.Errorf("sync not ready yet")
	}

	return svc.SyncWithPeer(ctx, deviceID, initialObjects...)
}
