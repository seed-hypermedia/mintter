package api

import (
	"context"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	documents "mintter/backend/daemon/api/documents/v1alpha"
	networking "mintter/backend/daemon/api/networking/v1alpha"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/syncing"
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
	Site       *mttnet.Server
}

// New creates a new API server.
func New(
	ctx context.Context,
	id *future.ReadOnly[core.Identity],
	repo *ondisk.OnDisk,
	db *sqlitex.Pool,
	v *vcsdb.DB,
	node *future.ReadOnly[*mttnet.Node],
	sync *future.ReadOnly[*syncing.Service],
	wallet *wallet.Service,
	cfg config.Site,
) Server {
	doSync := func() error {
		s, ok := sync.Get()
		if !ok {
			return fmt.Errorf("account is not initialized yet")
		}

		go func() {
			if err := s.SyncAndLog(context.Background()); err != nil {
				panic("bug or fatal error during sync " + err.Error())
			}
		}()

		return nil
	}

	documentsSrv := documents.NewServer(id, db, &lazyDiscoverer{sync: sync, net: node}, nil)
	siteSrv := mttnet.NewServer(ctx, cfg, node, documentsSrv)
	documentsSrv.RemoteCaller = siteSrv
	return Server{
		Accounts:   accounts.NewServer(id, v),
		Daemon:     daemon.NewServer(repo, v, wallet, doSync),
		Documents:  documentsSrv,
		Networking: networking.NewServer(node),
		Site:       siteSrv,
	}
}

type lazyDiscoverer struct {
	sync *future.ReadOnly[*syncing.Service]
	net  *future.ReadOnly[*mttnet.Node]
}

// DiscoverObject attempts to discover a given Mintter Object with an optional version specified.
// If no version is specified it tries to find whatever is possible.
func (ld *lazyDiscoverer) DiscoverObject(ctx context.Context, obj cid.Cid, version []cid.Cid) error {
	svc, err := ld.sync.Await(ctx)
	if err != nil {
		return err
	}

	return svc.DiscoverObject(ctx, obj, version)
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
