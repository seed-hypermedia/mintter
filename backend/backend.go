package backend

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/event"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	gostream "github.com/libp2p/go-libp2p-gostream"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/status"

	accounts "mintter/backend/api/accounts/v1alpha"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"mintter/backend/ipfs/sqlitebs"
	"mintter/backend/lndhub"
	"mintter/backend/vcs/vcssql"
)

// Log messages.
const (
	LogMsgFailedToSyncDeviceAccount = "FailedToSyncDeviceAccount"
)

const accountsPullInterval = time.Minute

// backend is the glue between major pieces of Mintter application.
// But actually it turned out to be a kitchen sink of all kinds of stuff.
// Eventually this will need to be cleaned up.
type backend struct {
	sqlitePatchStore
	*graphdb

	log       *zap.Logger
	repo      *repo
	p2p       *p2pNode
	pool      *sqlitex.Pool
	startTime time.Time

	// We don't want any concurrent registration calls happening,
	// plus we sometimes need to serialize requests from the UI.
	// For example when updating drafts and stuff like that.
	//
	// TODO: we should not need that.
	mu sync.Mutex

	rpc grpcConnections
	// dialOpts must only be used after P2P node is ready.
	dialOpts []grpc.DialOption

	// the client to connect to lightning wallets
	lightningClient *lnclient

	watchMu  sync.RWMutex
	watchers map[chan<- interface{}]struct{}
}

func newBackend(log *zap.Logger, pool *sqlitex.Pool, r *repo, p2p *p2pNode) *backend {
	srv := &backend{
		log:     log,
		repo:    r,
		graphdb: &graphdb{pool: pool},
		p2p:     p2p,
		pool:    pool,

		startTime: time.Now().UTC(),

		dialOpts: makeDialOpts(p2p.libp2p.Host),

		lightningClient: &lnclient{Lndhub: lndhub.NewClient(&http.Client{})},

		sqlitePatchStore: sqlitePatchStore{db: pool, bs: p2p.bs.Blockstore()},
	}

	return srv
}

// Start instruct the backend to wait until account is ready to use
// and then start the P2P services. Start blocks and returns
// when the process is finished or ctx is canceled.
func (srv *backend) Start(ctx context.Context) (err error) {
	// When we start the backend it may be that we don't have the account
	// yet, thus we don't want to start all the other services, until the registration happen.
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-srv.repo.Ready():
		break
	}

	defer multierr.AppendInvoke(&err, multierr.Close(&srv.rpc))

	g := srv.startBackgroundJobs(ctx)

	// Provide our own account on the DHT.
	acc, err := srv.repo.Account()
	if err != nil {
		return fmt.Errorf("failed to get account to provide: %w", err)
	}

	srv.p2p.prov.EnqueueProvide(ctx, cid.Cid(acc.CID()))

	return g.Wait()
}

func (srv *backend) GetDeviceAddrs(d DeviceID) ([]multiaddr.Multiaddr, error) {
	ipfs, err := srv.readyIPFS()
	if err != nil {
		return nil, err
	}

	info := ipfs.libp2p.Peerstore().PeerInfo(d.PeerID())
	return peer.AddrInfoToP2pAddrs(&info)
}

func (srv *backend) GetAccountForDevice(ctx context.Context, d DeviceID) (AccountID, error) {
	if srv.repo.Device().CID().Equals(cid.Cid(d)) {
		acc, err := srv.repo.Account()
		if err != nil {
			return AccountID{}, status.Errorf(codes.FailedPrecondition, "failed to get own account: %v", err)
		}

		return AccID(acc.CID()), nil
	}

	return srv.graphdb.GetAccountForDevice(ctx, d)
}

func (srv *backend) Connect(ctx context.Context, addrs ...multiaddr.Multiaddr) error {
	return fmt.Errorf("unimplemented")
	p2p, err := srv.readyIPFS()
	if err != nil {
		return err
	}

	if len(addrs) == 0 {
		return fmt.Errorf("at least one address is required to connect")
	}

	for i, a := range addrs {
		info, err := peer.AddrInfoFromP2pAddr(a)
		if err != nil {
			return fmt.Errorf("failed to parse %s: %w", a, err)
		}

		// Since we're explicitly connecting to a peer, we want to clear any backoffs
		// that the network might have at the moment. We only need to do this once per peer,
		// so we use the first address in the list for that.
		if i == 0 {
			sw, ok := p2p.libp2p.Host.Network().(*swarm.Swarm)
			if ok {
				sw.Backoff().Clear(info.ID)
			}
		}

		// Remember peer, check inside handleMintterPeer.

		// We return as soon as we connect to at least one address.
		if err := p2p.libp2p.Host.Connect(ctx, *info); err == nil {
			return nil
		}
	}

	return nil
}

func (srv *backend) ListAccounts(ctx context.Context) ([]accountsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	me, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	accs, err := accountsList(conn, me.CID().Hash())
	if err != nil {
		return nil, err
	}

	return accs, nil
}

// Notify will notify the given channel about the underlying events. Messages can get dropped for slow receivers.
func (srv *backend) Notify(c chan<- interface{}) {
	srv.watchMu.Lock()
	if srv.watchers == nil {
		srv.watchers = make(map[chan<- interface{}]struct{})
	}
	srv.watchers[c] = struct{}{}
	srv.watchMu.Unlock()
}

// StopNotify will stop notifying the channel about the underlying events.
func (srv *backend) StopNotify(c chan<- interface{}) {
	srv.watchMu.Lock()
	delete(srv.watchers, c)
	srv.watchMu.Unlock()
}

func timeFromSeconds(sec int) time.Time {
	return time.Unix(int64(sec), 0).UTC()
}

// Account returns our own account.
func (srv *backend) Account() (core.PublicKey, error) {
	return srv.repo.Account()
}

func (srv *backend) InitObject(ctx context.Context, aid AccountID, did DeviceID, oid cid.Cid, permablk blocks.Block) (err error) {
	s := srv.sqlitePatchStore

	ocodec, ohash := ipfs.DecodeCID(oid)

	acodec, ahash := ipfs.DecodeCID(cid.Cid(aid))
	if acodec != codecAccountID {
		panic("BUG: wrong codec for account")
	}

	dcodec, dhash := ipfs.DecodeCID(cid.Cid(did))
	if dcodec != cid.Libp2pKey {
		panic("BUG: wrong codec for device")
	}

	conn, ok := sqlitebs.ConnFromContext(ctx)
	if !ok {
		c, release, err := s.db.Conn(ctx)
		if err != nil {
			return err
		}
		defer release()
		conn = c

		if err := sqlitex.Exec(conn, "BEGIN IMMEDIATE TRANSACTION", nil); err != nil {
			return err
		}

		defer func() {
			if err != nil {
				err = multierr.Append(err, sqlitex.Exec(conn, "ROLLBACK", nil))
			} else {
				err = sqlitex.Exec(conn, "COMMIT", nil)
			}
		}()
	}

	defer sqlitex.Save(conn)(&err)

	if err := accountsInsertOrIgnore(conn, ahash, int(acodec)); err != nil {
		return err
	}

	if err := devicesInsertOrIgnore(conn, dhash, int(dcodec), ahash, int(acodec)); err != nil {
		return err
	}

	if permablk == nil {
		blk, err := blocks.NewBlockWithCid(nil, cid.Cid(oid))
		if err != nil {
			return err
		}
		permablk = blk
	}

	if err := s.bs.Put(sqlitebs.ContextWithConn(ctx, conn), permablk); err != nil {
		return err
	}

	// Insert object reusing data from ipfs blocks table.
	{
		dbaid, err := lookupAccID(conn, cid.Cid(aid))
		if err != nil {
			return err
		}

		res, err := vcssql.IPFSBlocksLookupPK(conn, ohash, int(ocodec))
		if err != nil {
			return err
		}

		if err := vcssql.ObjectsInsertOrIgnore(conn, res.IPFSBlocksID, ohash, int(ocodec), dbaid); err != nil {
			return err
		}
	}

	return nil
}

// GetPermanode from the underlying storage.
func (srv *backend) GetPermanode(ctx context.Context, c cid.Cid) (signedPermanode, error) {
	// This is all quite messy. Need to clean up.
	codec, _ := ipfs.DecodeCID(c)
	if codec != codecDocumentID {
		panic("BUG: trying to get permanode for non-document object")
	}

	blk, err := srv.p2p.bs.Blockstore().Get(ctx, c)
	if err != nil {
		return signedPermanode{}, err
	}

	perma, err := decodePermanodeBlock(blk)
	if err != nil {
		return signedPermanode{}, err
	}

	return signedPermanode{
		perma: perma,
		blk:   blk,
	}, nil
}

// emitEvent notifies subscribers about an internal event that occurred.
//
// TODO: implement some event interface instead of an empty one.
func (srv *backend) emitEvent(ctx context.Context, evt interface{}) {
	srv.watchMu.RLock()
	defer srv.watchMu.RUnlock()
	if srv.watchers == nil {
		return
	}

	for c := range srv.watchers {
		select {
		case <-ctx.Done():
			return
		case c <- evt:
		}
	}
}

func (srv *backend) handleLibp2pEvent(ctx context.Context, evt interface{}) error {
	switch e := evt.(type) {
	case event.EvtPeerIdentificationCompleted:
		protos, err := srv.p2p.libp2p.Host.Peerstore().GetProtocols(e.Peer)
		if err != nil {
			srv.log.Error("FailedToGetProtocolsForPeer",
				zap.String("peer", e.Peer.String()),
				zap.String("device", peer.ToCid(e.Peer).String()),
				zap.Error(err),
			)
			return nil
		}

		if supportsMintterProtocol(protos) {
			return srv.handleMintterPeer(ctx, e)
		}
	}

	return nil
}

func (srv *backend) handleMintterPeer(ctx context.Context, evt event.EvtPeerIdentificationCompleted) (err error) {
	log := srv.log.With(
		zap.String("device", peer.ToCid(evt.Peer).String()),
	)

	log.Debug("MintterPeerConnected")
	defer func() {
		if err != nil {
			log.Warn("MintterPeerConnectionFailed", zap.Error(err))
		}
	}()

	pid := evt.Peer

	conn, err := srv.dialPeer(ctx, pid)
	if err != nil {
		return err
	}

	c := p2p.NewP2PClient(conn)

	// TODO: check if we knew this peer before, so we don't need to fetch its account here,
	// as it will be performed automatically in the background process.

	_, err = srv.graphdb.GetAccountForDevice(ctx, DeviceID(peer.ToCid(pid)))
	if err == nil {
		return nil
	}

	if err != errNotFound {
		return err
	}

	info, err := c.GetPeerInfo(ctx, &p2p.GetPeerInfoRequest{})
	if err != nil {
		return fmt.Errorf("failed to get peer info for device %s: %w", peer.ToCid(pid), err)
	}

	aid, err := cid.Decode(info.AccountId)
	if err != nil {
		return fmt.Errorf("failed to decode account id %s: %w", info.AccountId, err)
	}

	if err := srv.syncObject(ctx, aid, pid); err != nil {
		return fmt.Errorf("failed to sync mintter account: %w", err)
	}

	log.Debug("MintterPeerVerified", zap.String("account", aid.String()))

	srv.emitEvent(ctx, accountVerified{
		Device:  DeviceID(peer.ToCid(pid)),
		Account: AccID(aid),
	})

	return nil
}

func (srv *backend) dialPeer(ctx context.Context, pid peer.ID) (*grpc.ClientConn, error) {
	// Dial options can only be used after P2P node is ready, so we have to check for that.
	if _, err := srv.readyIPFS(); err != nil {
		return nil, err
	}

	sw, ok := srv.p2p.libp2p.Host.Network().(*swarm.Swarm)
	if ok {
		sw.Backoff().Clear(pid)
	}

	srv.p2p.libp2p.Host.ConnManager().Protect(pid, protocolSupportKey)

	return srv.rpc.Dial(ctx, pid, srv.dialOpts)
}

func (srv *backend) readyIPFS() (*p2pNode, error) {
	select {
	case <-srv.p2p.Ready():
		return srv.p2p, nil
	default:
		return nil, fmt.Errorf("p2p node is not ready yet")
	}
}

type grpcConnections struct {
	mu    sync.Mutex
	conns map[peer.ID]*grpc.ClientConn
}

// Dial attempts to dial a peer by its ID. Callers must pass a ContextDialer option that would support dialing peer IDs.
// Clients MUST NOT close the connection manually.
func (c *grpcConnections) Dial(ctx context.Context, pid peer.ID, opts []grpc.DialOption) (*grpc.ClientConn, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		c.conns = make(map[peer.ID]*grpc.ClientConn)
	}

	if conn := c.conns[pid]; conn != nil {
		if conn.GetState() != connectivity.Shutdown {
			return conn, nil
		}

		// Best effort closing connection.
		go conn.Close()

		delete(c.conns, pid)
	}

	conn, err := grpc.DialContext(ctx, pid.String(), opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to establish connection to device %s: %w", peer.ToCid(pid), err)
	}

	if c.conns[pid] != nil {
		panic("BUG: adding connection while there's another open")
	}

	c.conns[pid] = conn

	return conn, nil
}

func (c *grpcConnections) Close() (err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		return nil
	}

	for _, conn := range c.conns {
		err = multierr.Append(err, conn.Close())
	}

	return err
}

func makeDialOpts(host host.Host) []grpc.DialOption {
	return []grpc.DialOption{
		grpc.WithContextDialer(func(ctx context.Context, target string) (net.Conn, error) {
			id, err := peer.Decode(target)
			if err != nil {
				return nil, fmt.Errorf("failed to dial peer %s: %w", target, err)
			}

			return gostream.Dial(ctx, host, id, ProtocolID)
		}),
		grpc.WithInsecure(),
		grpc.WithBlock(),
	}
}

func accountFromState(state *changeset) (*accounts.Account, error) {
	if state.size == 0 {
		return nil, fmt.Errorf("state is empty")
	}

	aid := state.obj.String()

	acc := &accounts.Account{
		Id:      aid,
		Profile: &accounts.Profile{},
		Devices: make(map[string]*accounts.Device),
	}

	for state.Next() {
		sp := state.Item()

		var ac AccountChange
		if err := ac.UnmarshalVT(sp.Body); err != nil {
			return nil, err
		}

		if ac.NewDeviceProof != "" {
			acc.Devices[sp.peer.String()] = &accounts.Device{
				PeerId: sp.peer.String(),
			}
		}

		if ac.NewAlias != "" {
			acc.Profile.Alias = ac.NewAlias
		}

		if ac.NewBio != "" {
			acc.Profile.Bio = ac.NewBio
		}

		if ac.NewEmail != "" {
			acc.Profile.Email = ac.NewEmail
		}
	}

	return acc, nil
}
