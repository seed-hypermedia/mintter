package backend

import (
	"context"
	"fmt"
	"net"
	"reflect"
	"sync"
	"time"

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
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	accounts "mintter/backend/api/accounts/v1alpha"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/cleanup"
)

// backend is the glue between major pieces of Mintter application.
// But actually it turned out to be a kitchen sink of all kinds of stuff.
// Eventually this will need to be cleaned up.
type backend struct {
	log     *zap.Logger
	repo    *repo
	db      *graphdb
	patches *patchStore
	p2p     *p2pNode
	drafts  *draftStore

	startTime time.Time

	// Paranoia Mode: we don't want any concurrent registration calls happening.
	registerMu sync.Mutex

	rpc grpcConnections
	// dialOpts must only be used after P2P node is ready.
	dialOpts []grpc.DialOption

	watchMu  sync.RWMutex
	watchers map[chan<- interface{}]struct{}
}

func newBackend(log *zap.Logger, r *repo, store *patchStore, p2p *p2pNode) *backend {
	srv := &backend{
		log:     log,
		repo:    r,
		db:      &graphdb{store.db},
		patches: store,
		p2p:     p2p,
		drafts:  &draftStore{r.draftsDir()},

		startTime: time.Now().UTC(),

		dialOpts: makeDialOpts(p2p.libp2p.Host),
	}

	return srv
}

// Start instruct the backend to wait until account is ready to use
// and then start the P2P services. Start blocks and returns
// when the process is finished or ctx is canceled.
func (srv *backend) Start(ctx context.Context) (err error) {
	// When we start the backend it may be that we don't have the account
	// yet, thus we don't want to start all the other services.
	// So we wait until the repo is ready, then start the P2P node,
	// wait until that one is ready, and then provide our own account on the DHT.
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-srv.repo.Ready():
		break
	}

	var clean cleanup.Stack
	defer func() {
		err = multierr.Append(err, clean.Close())
	}()
	clean.Add(&srv.rpc)

	sub, err := srv.p2p.libp2p.Host.EventBus().Subscribe(event.WildcardSubscription)
	if err != nil {
		return fmt.Errorf("failed to setup libp2p event listener: %w", err)
	}
	clean.Add(sub)

	g, ctx := errgroup.WithContext(ctx)

	// Start libp2p listener for Mintter protocol.
	g.Go(func() error {
		lis, err := gostream.Listen(srv.p2p.libp2p.Host, ProtocolID)
		if err != nil {
			return fmt.Errorf("failed to setup gostream listener: %w", err)
		}

		s := grpc.NewServer()
		p2p.RegisterP2PServer(s, &p2pAPI{back: srv})

		go func() {
			<-ctx.Done()
			s.GracefulStop()
		}()

		return s.Serve(lis)
	})

	// Handle libp2p events.
	g.Go(func() error {
		var wg sync.WaitGroup
		defer wg.Wait()

		for {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case evt, ok := <-sub.Out():
				if !ok {
					return fmt.Errorf("libp2p event channel closed")
				}

				wg.Add(1)
				go func() {
					err := srv.handleLibp2pEvent(ctx, evt)
					if err != nil {
						srv.log.Error("FailedToHandleLibp2pEvent",
							zap.Any("event", evt),
							zap.String("eventType", reflect.TypeOf(evt).String()),
							zap.Error(err),
						)
					}
					wg.Done()
				}()
			}
		}
	})

	// Start P2P node.
	g.Go(func() error {
		return srv.p2p.Start(ctx)
	})

	// Start reprovider when P2P node is ready to use.
	g.Go(func() error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-srv.p2p.Ready():
			return srv.p2p.prov.StartReproviding(ctx)
		}
	})

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
	srv.registerMu.Lock()
	defer srv.registerMu.Unlock()

	if len(m) != aezeed.NummnemonicWords {
		return AccountID{}, fmt.Errorf("mnemonic must be exactly %d words, got %d", aezeed.NummnemonicWords, len(m))
	}

	select {
	case <-srv.repo.Ready():
		return AccountID{}, status.Errorf(codes.FailedPrecondition, "account is already initialized")
	default:
		acc, err := NewAccountFromMnemonic(m, string(passphraze))
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to create account from mnemonic: %w", err)
		}

		aid := cid.Cid(acc.id)

		state, err := srv.patches.LoadState(ctx, aid)
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

	state, err := srv.patches.LoadState(ctx, cid.Cid(acc.id))
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

	evt := &accounts.ProfileUpdated{
		Profile: diff.(*accounts.Profile),
	}

	account.Profile = merged

	sp, err := state.NewProtoPatch(cid.Cid(acc.id), srv.repo.Device().priv, evt)
	if err != nil {
		return nil, fmt.Errorf("failed to produce patch to update profile: %w", err)
	}

	if err := srv.patches.AddPatch(ctx, sp); err != nil {
		return nil, fmt.Errorf("failed to store patch: %w", err)
	}

	return account, nil
}

func (srv *backend) GetAccountState(ctx context.Context, aid AccountID) (*state, error) {
	state, err := srv.patches.LoadState(ctx, cid.Cid(aid))
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

	return srv.db.GetDeviceAccount(ctx, d)
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

		// We return as soon as we connect to at least one address.
		if err := p2p.libp2p.Host.Connect(ctx, *info); err == nil {
			return nil
		}
	}

	return nil
}

func (srv *backend) ListAccounts(ctx context.Context) ([]*accounts.Account, error) {
	me, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	mecid := cid.Cid(me.id)

	objects, err := srv.db.ListAccounts(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get list of account ids: %w", err)
	}

	out := make([]*accounts.Account, len(objects)-1) // Minus our own Account.

	g, ctx := errgroup.WithContext(ctx)

	var skip bool
	for i, c := range objects {
		// Do not return our own account for the list.
		if mecid.Equals(c) {
			skip = true
			continue
		}

		if skip {
			i--
		}

		i, c := i, c
		g.Go(func() error {
			state, err := srv.patches.LoadState(ctx, c)
			if err != nil {
				return err
			}

			account, err := accountFromState(state)
			if err != nil {
				return err
			}
			out[i] = account

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("failed to resolve accounts: %w", err)
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

// CreateDraft creates a new draft and returns its ID.
// ID of a draft is a CID of a permanode using mintter-document CID codec.
func (srv *backend) CreateDraft(ctx context.Context, perma signedPermanode, data []byte) (cid.Cid, error) {
	p2p, err := srv.readyIPFS()
	if err != nil {
		return cid.Undef, err
	}

	if err := p2p.bs.Blockstore().Put(perma.blk); err != nil {
		return cid.Undef, fmt.Errorf("failed to add permanode block: %w", err)
	}

	if _, err := srv.patches.UpsertObjectID(ctx, perma.blk.Cid()); err != nil {
		return cid.Undef, fmt.Errorf("failed to register object id for draft: %w", err)
	}

	if err := srv.drafts.StoreDraft(perma.blk.Cid(), data); err != nil {
		return cid.Undef, fmt.Errorf("failed to store draft content: %w", err)
	}

	if err := srv.db.IndexDocument(ctx, perma.blk.Cid(), srv.repo.acc.id, "", "", perma.perma.CreateTime, perma.perma.CreateTime); err != nil {
		return cid.Undef, err
	}

	return perma.blk.Cid(), nil
}

// NewDocumentPermanode creates a new permanode signed with the backend's private key.
// It's expected to be stored in the block store later.
func (srv *backend) NewDocumentPermanode() (signedPermanode, error) {
	return newSignedPermanode(codecDocumentID, srv.repo.device.priv)
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
				zap.Error(err),
			)
			return nil
		}

		if supportsMintterProtocol(protos) {
			srv.log.Debug("MintterPeerConnected",
				zap.String("peer", e.Peer.String()),
			)
			return srv.handleMintterPeer(ctx, e.Peer)
		}
	}

	return nil
}

func (srv *backend) handleMintterPeer(ctx context.Context, pid peer.ID) error {
	srv.p2p.libp2p.Host.ConnManager().Protect(pid, protocolSupportKey)

	conn, err := srv.dialPeer(ctx, pid)
	if err != nil {
		return err
	}

	c := p2p.NewP2PClient(conn)

	// TODO: check if we already know this peer, so that we don't need to ask its account id again.

	info, err := c.GetPeerInfo(ctx, &p2p.GetPeerInfoRequest{})
	if err != nil {
		return fmt.Errorf("failed to get peer info for peer %s: %w", pid.String(), err)
	}

	aid, err := cid.Decode(info.AccountId)
	if err != nil {
		return fmt.Errorf("failed to decode account id %s: %w", info.AccountId, err)
	}

	remoteVer, err := c.GetObjectVersion(ctx, &p2p.GetObjectVersionRequest{
		ObjectId: info.AccountId,
	})
	if err != nil {
		return fmt.Errorf("failed to request account version for peer %s: %w", pid.String(), err)
	}

	localVer, err := srv.patches.GetObjectVersion(ctx, aid)
	if err != nil {
		return fmt.Errorf("failed to get local object version for peer %s: %w", pid.String(), err)
	}

	mergedVer := mergeVersions(localVer, remoteVer)

	state, err := resolvePatches(ctx, aid, mergedVer, srv.p2p.bs)
	if err != nil {
		return fmt.Errorf("failed to resolve account %s: %w", aid, err)
	}

	account, err := accountFromState(state)
	if err != nil {
		return err
	}

	deviceID := peer.ToCid(pid)
	if _, ok := account.Devices[deviceID.String()]; !ok {
		return fmt.Errorf("device %s is not found in account %s", deviceID, aid)
	}

	if err := srv.patches.StoreVersion(ctx, aid, mergedVer); err != nil {
		return fmt.Errorf("failed to store version: %w", err)
	}

	if err := srv.db.StoreDevice(ctx, AccountID(aid), DeviceID(deviceID)); err != nil {
		return fmt.Errorf("failed to store device of the connected peer %s: %w", deviceID, err)
	}

	srv.emitEvent(ctx, accountVerified{
		Device:  DeviceID(deviceID),
		Account: AccountID(aid),
	})

	return nil
}

func (srv *backend) dialPeer(ctx context.Context, pid peer.ID) (*grpc.ClientConn, error) {
	// Dial options can only be used after P2P node is ready, so we have to check for that.
	if _, err := srv.readyIPFS(); err != nil {
		return nil, err
	}

	return srv.rpc.Dial(ctx, pid, srv.dialOpts)
}

func (srv *backend) register(ctx context.Context, state *state, binding AccountBinding) error {
	sp, err := state.NewProtoPatch(binding.Account, srv.repo.Device().priv, &accounts.DeviceRegistered{
		Proof: binding.AccountProof,
	})
	if err != nil {
		return fmt.Errorf("failed to create a patch: %w", err)
	}

	if err := srv.patches.AddPatch(ctx, sp); err != nil {
		return fmt.Errorf("failed to add patch: %w", err)
	}

	if err := srv.db.StoreDevice(ctx, AccountID(binding.Account), DeviceID(binding.Member)); err != nil {
		return fmt.Errorf("failed to store own device-account relationship: %w", err)
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
		return nil, fmt.Errorf("failed to establish connection to %s: %w", pid.String(), err)
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

func accountFromState(state *state) (*accounts.Account, error) {
	if state.size == 0 {
		return nil, fmt.Errorf("state is empty")
	}

	aid := state.obj.String()

	acc := &accounts.Account{}

	for state.Next() {
		sp := state.Item()
		msg, err := sp.ProtoBody()
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal proto body: %w", err)
		}

		switch data := msg.(type) {
		case *accounts.DeviceRegistered:
			if acc.Id == "" {
				acc.Id = aid
			}

			if acc.Id != aid {
				return nil, fmt.Errorf("profile update from unrelated author")
			}

			// TODO: verify proof

			_ = data.Proof
			if acc.Devices == nil {
				acc.Devices = make(map[string]*accounts.Device)
			}
			d := &accounts.Device{
				PeerId:       sp.peer.String(),
				RegisterTime: timestamppb.New(sp.CreateTime),
			}
			acc.Devices[d.PeerId] = d
		case *accounts.ProfileUpdated:
			if acc.Profile == nil {
				acc.Profile = data.Profile
			} else {
				proto.Merge(acc.Profile, data.Profile)
			}
		}
	}

	return acc, nil
}
