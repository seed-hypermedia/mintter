package backend

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/event"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	gostream "github.com/libp2p/go-libp2p-gostream"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"

	accounts "mintter/backend/api/accounts/v1alpha"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/lndhub"
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

	log       *zap.Logger
	repo      *repo
	db        *graphdb
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
		log:  log,
		repo: r,
		db:   &graphdb{pool: pool},
		p2p:  p2p,
		pool: pool,

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

	srv.p2p.prov.EnqueueProvide(ctx, cid.Cid(acc.id))

	return g.Wait()
}

// Register an account on this node using provided mnemonic.
func (srv *backend) Register(ctx context.Context, m aezeed.Mnemonic, passphraze string) (AccountID, error) {
	srv.mu.Lock()
	defer srv.mu.Unlock()

	if len(m) != aezeed.NumMnemonicWords {
		return AccountID{}, fmt.Errorf("mnemonic must be exactly %d words, got %d", aezeed.NumMnemonicWords, len(m))
	}

	select {
	case <-srv.repo.Ready():
		return AccountID{}, status.Errorf(codes.FailedPrecondition, "account is already initialized")
	default:
		acc, err := NewAccountFromMnemonic(m, passphraze)
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to create account from mnemonic: %w", err)
		}

		aid := cid.Cid(acc.id)

		state, err := srv.LoadState(ctx, aid)
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to load account state: %w", err)
		}

		// TODO: this can be non-empty if we have created the account previously,
		// but failed to write the account file and close the account ready channel.
		// Thus we have to check here if the incoming account is the same - if not fail,
		// and if it is the same - skip creating the patch, and just store the account file.
		// Since it's a very weird situation, we don't have time to deal with that right now.
		if !state.IsEmpty() {
			panic("WEIRD BUG: remove your Mintter state folder and start over again")
		}

		binding, err := InviteDevice(acc, srv.repo.Device())
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to create account binding: %w", err)
		}

		if err := srv.register(ctx, state, binding); err != nil {
			return AccountID{}, fmt.Errorf("failed to register account: %w", err)
		}

		if err := srv.repo.CommitAccount(acc); err != nil {
			return AccountID{}, fmt.Errorf("failed to write account file: %w", err)
		}

		// TODO: Here we would need to publish our patch on the PubSub, so that people can discover our new device,
		// but since there would be actually no one to receive the message, it doesn't really make much sense.
		// Plus it complicates a lot the whole process. There's a bit of a chicken-and-egg problem: we don't know
		// which topic to publish to until we create the account, and account gets created just when we publish the patch.
		// We leave it as is right now, but let's see if we need to do something with it in the future.

		return AccountID(aid), nil
	}
}

func (srv *backend) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	acc, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	state, err := srv.LoadState(ctx, cid.Cid(acc.id))
	if err != nil {
		return nil, err
	}

	account, err := accountFromState(state)
	if err != nil {
		return nil, err
	}

	merged := &accounts.Profile{}
	if account.Profile == nil {
		account.Profile = &accounts.Profile{}
	}
	proto.Merge(merged, account.Profile)
	proto.Merge(merged, in)

	diff := diffProto(account.Profile, merged)
	if diff == nil {
		return account, nil
	}

	diffu := diff.(*accounts.Profile)

	var evt AccountChange

	if diffu.Alias != "" {
		evt.NewAlias = diffu.Alias
	}

	if diffu.Bio != "" {
		evt.NewBio = diffu.Bio
	}

	if diffu.Email != "" {
		evt.NewEmail = diffu.Email
	}

	account.Profile = merged

	sp, err := state.NewProtoPatch(cid.Cid(acc.id), srv.repo.Device().priv, &evt)
	if err != nil {
		return nil, fmt.Errorf("failed to produce patch to update profile: %w", err)
	}

	if err := srv.AddPatch(ctx, sp); err != nil {
		return nil, err
	}

	return account, nil
}

func (srv *backend) GetAccountState(ctx context.Context, aid AccountID) (*changeset, error) {
	state, err := srv.LoadState(ctx, cid.Cid(aid))
	if err != nil {
		return nil, fmt.Errorf("failed to load state for account %s: %w", aid, err)
	}

	return state, nil
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
	if srv.repo.device.ID().Equals(d) {
		acc, err := srv.repo.Account()
		if err != nil {
			return AccountID{}, status.Errorf(codes.FailedPrecondition, "failed to get own account: %v", err)
		}

		return acc.id, nil
	}

	return srv.db.GetAccountForDevice(ctx, d)
}

func (srv *backend) Connect(ctx context.Context, addrs ...multiaddr.Multiaddr) error {
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

func (srv *backend) ListAccounts(ctx context.Context) ([]*accounts.Account, error) {
	// N+1 is not that big of a deal in SQLite.
	// https://www.sqlite.org/np1queryprob.html

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	me, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	accs, err := accountsList(conn, me.id.Hash())
	if err != nil {
		return nil, err
	}

	out := make([]*accounts.Account, len(accs))

	for i, a := range accs {
		if a.AccountsCodec != int(codecAccountID) {
			return nil, fmt.Errorf("invalid codec for account %s", cid.CodecToStr[uint64(a.AccountsCodec)])
		}

		aid := cid.NewCidV1(uint64(a.AccountsCodec), a.AccountsMultihash)

		out[i] = &accounts.Account{
			Id: aid.String(),
			Profile: &accounts.Profile{
				Email: a.AccountsEmail,
				Bio:   a.AccountsBio,
				Alias: a.AccountsAlias,
			},
		}

		devices, err := devicesList(conn)
		if err != nil {
			return nil, err
		}

		out[i].Devices = make(map[string]*accounts.Device, len(devices))

		for _, d := range devices {
			if d.DevicesCodec != cid.Libp2pKey {
				return nil, fmt.Errorf("invalid codec for device %s", cid.CodecToStr[uint64(d.DevicesCodec)])
			}

			did := cid.NewCidV1(uint64(d.DevicesCodec), d.DevicesMultihash).String()

			out[i].Devices[did] = &accounts.Device{
				PeerId: did,
			}
		}
	}

	return out, nil
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
func (srv *backend) Account() (PublicAccount, error) {
	return srv.repo.Account()
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

	srv.p2p.libp2p.Host.ConnManager().Protect(pid, protocolSupportKey)

	conn, err := srv.dialPeer(ctx, pid)
	if err != nil {
		return err
	}

	c := p2p.NewP2PClient(conn)

	// TODO: check if we knew this peer before, so we don't need to fetch its account here,
	// as it will be performed automatically in the background process.

	_, err = srv.db.GetAccountForDevice(ctx, DeviceID(peer.ToCid(pid)))
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
		Account: AccountID(aid),
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

	return srv.rpc.Dial(ctx, pid, srv.dialOpts)
}

func (srv *backend) register(ctx context.Context, state *changeset, binding AccountBinding) error {
	evt := AccountChange{
		NewDeviceProof: string(binding.AccountProof),
	}

	sp, err := state.NewProtoPatch(binding.Account, srv.repo.Device().priv, &evt)
	if err != nil {
		return fmt.Errorf("failed to create a patch: %w", err)
	}

	if err := srv.db.StoreDevice(ctx, AccountID(binding.Account), DeviceID(binding.Member)); err != nil {
		return fmt.Errorf("failed to store own device-account relationship: %w", err)
	}

	if err := srv.AddPatch(ctx, sp); err != nil {
		return fmt.Errorf("failed to add patch: %w", err)
	}

	return nil
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
