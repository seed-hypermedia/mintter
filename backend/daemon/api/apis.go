package api

import (
	"context"
	"fmt"
	accounts "seed/backend/daemon/api/accounts/v1alpha"
	activity "seed/backend/daemon/api/activity/v1alpha"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	documents "seed/backend/daemon/api/documents/v1alpha"
	entities "seed/backend/daemon/api/entities/v1alpha"
	groups "seed/backend/daemon/api/groups/v1alpha"
	networking "seed/backend/daemon/api/networking/v1alpha"
	"seed/backend/daemon/storage"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/mttnet"
	"seed/backend/pkg/future"
	"seed/backend/syncing"
	"seed/backend/wallet"

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
	Activity   *activity.Server
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
			if err := s.SyncAllAndLog(ctx); err != nil {
				panic("bug or fatal error during sync " + err.Error())
			}
		}()

		return nil
	}

	documentsSrv := documents.NewServer(repo.Identity(), db, &lazyDiscoverer{sync: sync, net: node}, &lazyGwClient{net: node}, LogLevel)
	return Server{
		Accounts:   accounts.NewServer(repo.Identity(), blobs),
		Activity:   activity.NewServer(repo.Identity(), db),
		Daemon:     daemon.NewServer(repo, blobs, wallet, doSync),
		Documents:  documentsSrv,
		Networking: networking.NewServer(blobs, node),
		Entities:   entities.NewServer(blobs, &lazyDiscoverer{sync: sync}),
		Groups:     groups.NewServer(repo.Identity(), logging.New("seed/groups", LogLevel), groups.NewSQLiteDB(db), blobs, node),
	}
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
	sync *future.ReadOnly[*syncing.Service]
	net  *future.ReadOnly[*mttnet.Node]
}

// DiscoverObject attempts to discover a given Seed Object with an optional version specified.
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
func (ld *lazyDiscoverer) SyncWithPeer(ctx context.Context, deviceID peer.ID) error {
	svc, ok := ld.sync.Get()
	if !ok {
		return fmt.Errorf("sync not ready yet")
	}

	return svc.SyncWithPeer(ctx, deviceID)
}
