package backend

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"net/http"
	"reflect"
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
	"mintter/backend/ipfs"
	"mintter/backend/ipfs/sqlitebs"
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

	sub, err := srv.p2p.libp2p.Host.EventBus().Subscribe([]interface{}{
		&event.EvtPeerIdentificationCompleted{},
	})
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

		// For some very-very-very annoying reason libp2p might deliver duplicate
		// events. This is especially annoying in tests, because after initial peer
		// verification is done we may go into another one because of the duplicate event.
		// I couldn't figure out why it was happenning, so I implemented a simply dedupe here.
		// We'll track events that we receive and launch handling for, and we remove them
		// from the map some time after they are handled.

		// On this channel handled events will be returned, so we can clean them up from the dedupe map.
		handled := make(chan interface{}, 10)

		seen := map[interface{}]struct{}{}

		for {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case evt := <-handled:
				delete(seen, evt)
			case evt, ok := <-sub.Out():
				if !ok {
					return fmt.Errorf("libp2p event channel closed")
				}

				// TODO: collect metrics about how many duplicate events we get of each type.
				// See if reporting an issue is necessary.

				if _, ok := seen[evt]; ok {
					continue
				}

				seen[evt] = struct{}{}

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

					// We'll sleep for some arbitrary amount of time so that potential duplicate
					// event have time to be deduped. We're doing this after wg.Done
					// because we don't to wait for this if we want to exit the app.
					time.Sleep(time.Second)
					handled <- evt
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

	// Start pulling account updates.
	g.Go(func() error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-srv.p2p.Ready():
			break
		}

		t := time.NewTimer(time.Hour)
		t.Stop()
		defer t.Stop()

		for {
			if err := srv.SyncAccounts(ctx); err != nil {
				return err
			}

			t.Reset(accountsPullInterval)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-t.C:
				continue
			}
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

func (srv *backend) SaveDraft(
	ctx context.Context,
	perma signedPermanode,
	title string,
	subtitle string,
	createTime time.Time,
	updateTime time.Time,
	content []byte,
) (err error) {
	srv.mu.Lock()
	defer srv.mu.Unlock()

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	ocodec, ohash := ipfs.DecodeCID(perma.blk.Cid())

	if ocodec != codecDocumentID {
		panic("BUG: bad codec for draft " + cid.CodecToStr[ocodec])
	}

	if err := srv.InitObject(sqlitebs.ContextWithConn(ctx, conn), perma); err != nil {
		return err
	}

	if err := draftsUpsert(conn, ohash, int(ocodec), title, subtitle, content, int(createTime.Unix()), int(updateTime.Unix())); err != nil {
		return err
	}

	return nil
}

// Draft represents a document Draft.
type Draft struct {
	Title      string
	Subtitle   string
	Content    []byte
	CreateTime time.Time
	UpdateTime time.Time
}

func (srv *backend) GetDraft(ctx context.Context, c cid.Cid) (Draft, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return Draft{}, err
	}

	ocodec, hash := ipfs.DecodeCID(c)

	result, err := draftsGet(conn, hash, int(ocodec))
	release()
	if err != nil {
		return Draft{}, err
	}
	if result.DraftsCreateTime == 0 {
		return Draft{}, errNotFound
	}

	return Draft{
		Title:      result.DraftsTitle,
		Subtitle:   result.DraftsSubtitle,
		Content:    result.DraftsContent,
		CreateTime: timeFromSeconds(result.DraftsCreateTime),
		UpdateTime: timeFromSeconds(result.DraftsUpdateTime),
	}, nil
}

func timeFromSeconds(sec int) time.Time {
	return time.Unix(int64(sec), 0).UTC()
}

func (srv *backend) DeleteDraft(ctx context.Context, c cid.Cid) (err error) {
	// Because we store drafts and publications in the same table, in order to
	// delete a draft we have to do a bit of a workaround here.
	// We first clear the draft-related fields, and only delete the record
	// if there's no publication with the same document ID.

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	codec, hash := ipfs.DecodeCID(c)

	if codec != codecDocumentID {
		panic("BUG: wrong codec for draft")
	}

	// TODO: if we don't have any publications also delete the object.

	return draftsDelete(conn, hash, int(codec))
}

func (srv *backend) ListDrafts(ctx context.Context) ([]draftsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return draftsList(conn)
}

type Publication struct {
	Draft

	Author      cid.Cid
	Version     string
	PublishTime time.Time
}

func (pub *Publication) applyChange(change signedPatch) error {
	var evt DocumentChange

	// TODO: avoid double serialization here.

	if err := evt.UnmarshalVT(change.Body); err != nil {
		return nil
	}

	// The first patch ever must have author and create time.
	if evt.Author != "" {
		if pub.Author.Defined() {
			return fmt.Errorf("malformed publication changeset: got author when was already set")
		}

		aid, err := accountIDFromString(evt.Author)
		if err != nil {
			return err
		}

		pub.Author = cid.Cid(aid)

		if evt.CreateTime == nil {
			return fmt.Errorf("missing create time on initial publication change")
		}

		pub.CreateTime = evt.CreateTime.AsTime()
	}

	if change.LamportTime > 1 && !pub.Author.Defined() {
		return fmt.Errorf("missing initial patch for publication")
	}

	pub.Version = change.cid.String()
	pub.PublishTime = change.CreateTime
	pub.UpdateTime = evt.UpdateTime.AsTime()

	if evt.TitleUpdated != "" {
		pub.Title = evt.TitleUpdated
	}

	if evt.SubtitleUpdated != "" {
		pub.Subtitle = evt.SubtitleUpdated
	}

	if evt.ContentUpdated != nil {
		pub.Content = evt.ContentUpdated
	}

	return nil
}

func publicationFromChanges(s *changeset) (Publication, error) {
	var pub Publication

	for s.Next() {
		change := s.Item()
		if err := pub.applyChange(change); err != nil {
			return Publication{}, err
		}
	}
	return pub, nil
}

func (srv *backend) PublishDraft(ctx context.Context, c cid.Cid) (Publication, error) {
	srv.mu.Lock()
	defer srv.mu.Unlock()

	dcodec, _ := ipfs.DecodeCID(c)
	if dcodec != codecDocumentID {
		return Publication{}, fmt.Errorf("wrong codec for publishing document %s", cid.CodecToStr[dcodec])
	}

	draft, err := srv.GetDraft(ctx, c)
	if err != nil {
		return Publication{}, err
	}

	pubchanges, err := srv.LoadState(ctx, c)
	if err != nil {
		return Publication{}, err
	}

	pub, err := publicationFromChanges(pubchanges)
	if err != nil {
		return Publication{}, err
	}

	if pub.UpdateTime.Equal(draft.UpdateTime) {
		return Publication{}, fmt.Errorf("nothing to publish, update time is already published")
	}

	// TODO(burdiyan): If we're updating an existing publication there could be a weird edge case.
	// If we receive changes from other peers for this publication, it means that the draft
	// we're trying to publish doesn't have the most recent information, thus we may overwrite
	// changes from other peers without even knowing about it. Need to think about how to fix!
	// We'll probably need to store published version when we create a draft, or constantly keeping things up to date.
	// Maybe will even need to store drafts and publications separately in the database.

	acc, err := srv.repo.Account()
	if err != nil {
		return Publication{}, err
	}

	change := DocumentChange{
		UpdateTime: timestamppb.New(draft.UpdateTime),
	}
	{
		// For the first patch ever we want to set the dates and author.
		if pub.Author.Equals(cid.Undef) {
			change.Author = acc.id.String()
			change.CreateTime = timestamppb.New(draft.CreateTime)
		}

		if draft.Title != pub.Title {
			change.TitleUpdated = draft.Title
		}

		if draft.Subtitle != pub.Subtitle {
			change.SubtitleUpdated = draft.Subtitle
		}

		if !bytes.Equal(draft.Content, pub.Content) {
			change.ContentUpdated = draft.Content
		}
	}

	docChange, err := pubchanges.NewProtoPatch(cid.Cid(acc.id), srv.repo.device.priv, &change)
	if err != nil {
		return Publication{}, err
	}

	if err := pub.applyChange(docChange); err != nil {
		return Publication{}, err
	}

	docFeed, err := srv.LoadState(ctx, newDocumentFeedID(acc.id))
	if err != nil {
		return Publication{}, err
	}

	// TODO: this should not be necessary, but it is, so that we can get the next seq no.
	_ = docFeed.Merge()

	feedChange, err := docFeed.NewProtoPatch(cid.Cid(acc.id), srv.repo.Device().priv, &DocumentFeedChange{
		DocumentPublished: c.String(),
	})
	if err != nil {
		return Publication{}, fmt.Errorf("failed to create document feed patch: %w", err)
	}

	err = func() (err error) {
		conn, release, err := srv.pool.Conn(ctx)
		if err != nil {
			return err
		}
		defer release()

		defer sqlitex.Save(conn)(&err)

		cctx := sqlitebs.ContextWithConn(ctx, conn)

		if err := srv.AddPatch(cctx, docChange, feedChange); err != nil {
			return err
		}

		ocodec, ohash := ipfs.DecodeCID(c)

		if ocodec != codecDocumentID {
			panic("BUG: bad codec for publication " + cid.CodecToStr[ocodec])
		}

		if err := draftsDelete(conn, ohash, int(ocodec)); err != nil {
			return err
		}

		if err := publicationsIndex(conn, ocodec, ohash, pub); err != nil {
			return err
		}

		return nil
	}()
	if err != nil {
		return Publication{}, err
	}

	p2p, err := srv.readyIPFS()
	if err != nil {
		return Publication{}, err
	}

	p2p.prov.EnqueueProvide(ctx, c)
	p2p.prov.EnqueueProvide(ctx, docChange.cid)
	p2p.prov.EnqueueProvide(ctx, feedChange.cid)

	return pub, nil
}

func (srv *backend) ListPublications(ctx context.Context) ([]publicationsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return publicationsList(conn)
}

// Account returns our own account.
func (srv *backend) Account() (PublicAccount, error) {
	return srv.repo.Account()
}

func (srv *backend) DeletePublication(ctx context.Context, c cid.Cid) (err error) {
	codec, hash := ipfs.DecodeCID(c)

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	if err := objectsDelete(conn, hash, int(codec)); err != nil {
		return err
	}

	return nil
}

// NewDocumentPermanode creates a new permanode signed with the backend's private key.
// It's expected to be stored in the block store later.
func (srv *backend) NewDocumentPermanode() (signedPermanode, error) {
	acc, err := srv.repo.Account()
	if err != nil {
		return signedPermanode{}, err
	}

	return newSignedPermanode(codecDocumentID, acc.id, srv.repo.device.priv)
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
