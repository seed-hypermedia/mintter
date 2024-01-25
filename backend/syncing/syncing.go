package syncing

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/pkg/dqb"
	"sync"
	"sync/atomic"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/boxo/exchange"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"go.uber.org/zap"
)

// Metrics. This is exported as a temporary measure,
// because we have mostly the same code duplicated in groups and in syncing.
//
// TODO(burdiyan): refactor this to unify group syncing and normal periodic syncing.
var (
	MSyncingWantBlobs = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "mintter_syncing_wanted_blobs",
		Help: "Number of blobs we want to sync at this time.",
	}, []string{"package"})
)

// NetDialFunc is a function of the Mintter P2P node that creates an instance
// of a P2P RPC client for a given remote Device ID.
type NetDialFunc func(context.Context, peer.ID) (p2p.P2PClient, error)

// Bitswap is a subset of the Bitswap that is used by syncing service.
type Bitswap interface {
	NewSession(context.Context) exchange.Fetcher
	FindProvidersAsync(context.Context, cid.Cid, int) <-chan peer.AddrInfo
}

// Service manages syncing of Mintter objects among peers.
type Service struct {
	// warmupDuration defines how long to wait before the first sync after the service is started.
	// Can be changed before calling Start().
	warmupDuration time.Duration
	// syncInterval specifies how often global sync process is performed.
	// Can be changed before calling Start().
	syncInterval time.Duration
	// peerSyncTimeout defines the timeout for syncing with one peer.
	peerSyncTimeout time.Duration

	// burstSync attempts to sync all peers at once, creating CPU overhead.
	burstSync bool

	log     *zap.Logger
	db      *sqlitex.Pool
	blobs   *hyper.Storage
	me      core.Identity
	bitswap Bitswap
	client  NetDialFunc

	mu sync.Mutex // Ensures only one sync loop is running at a time.

	// DisableDiscovery can be used to disable remote content discovery.
	// This value must be set before calling start, and before calling any Discover methods.
	DisableDiscovery bool
}

const (
	defaultWarmupDuration  = time.Second * 20
	defaultSyncInterval    = time.Minute
	defaultPeerSyncTimeout = time.Minute * 5
)

// NewService creates a new syncing service. Users should call Start() to start the periodic syncing.
func NewService(log *zap.Logger, me core.Identity, db *sqlitex.Pool, blobs *hyper.Storage, bitswap Bitswap, client NetDialFunc) *Service {
	svc := &Service{
		warmupDuration:  defaultWarmupDuration,
		syncInterval:    defaultSyncInterval,
		peerSyncTimeout: defaultPeerSyncTimeout,

		log:     log,
		db:      db,
		blobs:   blobs,
		me:      me,
		bitswap: bitswap,
		client:  client,
	}

	return svc
}

// SetWarmupDuration sets the corresponding duration if it's non-zero.
// Must be called before calling Start().
func (s *Service) SetWarmupDuration(d time.Duration) {
	if d != 0 {
		s.warmupDuration = d
	}
}

// SetSyncInterval sets the corresponding duration if it's non-zero.
// Must be called before calling Start().
func (s *Service) SetSyncInterval(d time.Duration) {
	if d != 0 {
		s.syncInterval = d
	}
}

// SetPeerSyncTimeout sets the corresponding duration if it's non-zero.
// Must be called before calling Start().
func (s *Service) SetPeerSyncTimeout(d time.Duration) {
	if d != 0 {
		s.peerSyncTimeout = d
	}
}

// SetBurstSync sets wether or not syncing in bursts (CPU intense)
// or spawn routines throughout the syncing interval
func (s *Service) SetBurstSync(b bool) {
	s.burstSync = b
}

// Start the syncing service which will periodically perform global sync loop.
func (s *Service) Start(ctx context.Context) (err error) {
	s.log.Debug("SyncingServiceStarted")
	defer func() {
		s.log.Debug("SyncingServiceFinished", zap.Error(err))
	}()

	t := time.NewTimer(s.warmupDuration)
	defer t.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			if err := s.SyncAndLog(ctx); err != nil {
				return err
			}

			t.Reset(s.syncInterval)
		}
	}
}

// SyncAndLog is the same as Sync but will log the results instead of returning them.
// Calls will be de-duplicated as only one sync loop may be in progress at any given moment.
// Returned error indicates a fatal error. The behavior of calling Sync again after a fatal error is undefined.
func (s *Service) SyncAndLog(ctx context.Context) error {
	log := s.log.With(zap.Int64("traceID", time.Now().UnixMicro()))

	log.Info("SyncLoopStarted")

	res, err := s.Sync(ctx)
	if err != nil {
		if errors.Is(err, ErrSyncAlreadyRunning) {
			log.Debug("SyncLoopIsAlreadyRunning")
			return nil
		}
		return fmt.Errorf("fatal error in the sync background loop: %w", err)
	}

	for i, err := range res.Errs {
		if err != nil {
			log.Debug("SyncLoopError",
				zap.String("peer", res.Peers[i].String()),
				zap.Error(err),
			)
		}
	}

	log.Info("SyncLoopFinished",
		zap.Int64("failures", res.NumSyncFailed),
		zap.Int64("successes", res.NumSyncOK),
	)

	return nil
}

// ErrSyncAlreadyRunning is returned when calling Sync while one is already in progress.
var ErrSyncAlreadyRunning = errors.New("sync is already running")

// SyncResult is a summary of one Sync loop iteration.
type SyncResult struct {
	NumSyncOK     int64
	NumSyncFailed int64
	Peers         []peer.ID
	Errs          []error
}

var qListPeersToSync = dqb.Str(`
	SELECT
		del.principal AS delegate
	FROM key_delegations
	JOIN trusted_accounts ON trusted_accounts.id = key_delegations.issuer
	JOIN public_keys del ON del.id = key_delegations.delegate
`)

// Sync attempts to sync the objects with connected peers.
func (s *Service) Sync(ctx context.Context) (res SyncResult, err error) {
	if !s.mu.TryLock() {
		return res, ErrSyncAlreadyRunning
	}
	defer s.mu.Unlock()

	var peers []peer.ID
	if err := s.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.Exec(conn, qListPeersToSync(), func(stmt *sqlite.Stmt) error {
			pid, err := core.Principal(stmt.ColumnBytesUnsafe(0)).PeerID()
			if err != nil {
				return err
			}
			peers = append(peers, pid)
			return nil
		})
	}); err != nil {
		return res, err
	}

	res.Peers = make([]peer.ID, len(peers))
	res.Errs = make([]error, len(peers))
	var wg sync.WaitGroup
	wg.Add(len(peers))

	// In order not to create a CPU overhead we spread sync routines throughout the
	// syncing interval
	roundSleep := time.Microsecond * 0
	const numSlots = 100
	every := 1

	if !s.burstSync {
		roundSleep = (s.syncInterval * 85 / 100) / numSlots
		if len(peers) > numSlots {
			every = 1 + len(peers)/numSlots
		}
	}
	for i, pid := range peers {
		go func(i int, pid peer.ID) {
			var err error
			defer func() {
				res.Errs[i] = err
				if err == nil {
					atomic.AddInt64(&res.NumSyncOK, 1)
				} else {
					atomic.AddInt64(&res.NumSyncFailed, 1)
				}

				wg.Done()
			}()

			res.Peers[i] = pid

			if xerr := s.SyncWithPeer(ctx, pid); xerr != nil {
				err = errors.Join(err, fmt.Errorf("failed to sync objects: %w", xerr))
			}
		}(i, pid)
		if i%every == 0 {
			time.Sleep(roundSleep)
		}
	}

	wg.Wait()

	// Subtracting one to account for our own device.
	res.NumSyncOK--

	return res, nil
}

func (s *Service) syncObject(ctx context.Context, sess exchange.Fetcher, obj *p2p.Object) error {
	ctx, cancel := context.WithTimeout(ctx, time.Minute)
	defer cancel()

	bs := s.blobs.IPFSBlockstoreReader()

	// oid, err := hyper.EntityID(obj.Id).CID()
	// if err != nil {
	// 	return fmt.Errorf("can't sync object: failed to cast CID: %w", err)
	// }

	// // Hint to bitswap to only talk to peers who have the object.
	// if _, err := sess.GetBlock(ctx, oid); err != nil {
	// 	return fmt.Errorf("failed to start bitswap session: %w", err)
	// }

	// We have to check which of the remote changes we're actually missing to avoid
	// doing bitswap unnecessarily.
	var missingSorted []cid.Cid
	{
		for _, c := range obj.ChangeIds {
			cc, err := cid.Decode(c)
			if err != nil {
				return fmt.Errorf("failed to decode change CID: %w", err)
			}

			has, err := bs.Has(ctx, cc)
			if err != nil {
				return err
			}
			if !has {
				missingSorted = append(missingSorted, cc)
			}
		}
	}

	type verifiedChange struct {
		cid    cid.Cid
		change hyper.Change
	}

	// Fetch missing changes and make sure we have their parents.
	// We assume causally sorted list, but verifying just in case.
	visited := make(map[cid.Cid]struct{}, len(missingSorted))
	{
		for _, c := range missingSorted {
			blk, err := sess.GetBlock(ctx, c)
			if err != nil {
				return fmt.Errorf("failed to sync blob %s: %w", c, err)
			}

			var ch hyper.Change
			if err := cbornode.DecodeInto(blk.RawData(), &ch); err != nil {
				return fmt.Errorf("failed to decode change after sync: %w", err)
			}

			if err := ch.Verify(); err != nil {
				return fmt.Errorf("failed to verify signature for change %s: %w", c.String(), err)
			}

			// get delegation
			ok, err := bs.Has(ctx, ch.Delegation)
			if err != nil {
				return err
			}
			if !ok {
				kdblk, err := sess.GetBlock(ctx, ch.Delegation)
				if err != nil {
					return err
				}
				var kd hyper.KeyDelegation
				if err := cbornode.DecodeInto(kdblk.RawData(), &kd); err != nil {
					return err
				}
				if err := kd.Verify(); err != nil {
					return fmt.Errorf("failed to verify key delegation: %w", err)
				}
				kdblob, err := hyper.EncodeBlob(kd)
				if err != nil {
					return err
				}

				if !kdblob.CID.Equals(kdblk.Cid()) {
					return fmt.Errorf("reencoded key delegation cid doesn't match")
				}

				if err := s.blobs.SaveBlob(ctx, kdblob); err != nil {
					return fmt.Errorf("failed to save key delegation blob: %w", err)
				}
			}

			vc := verifiedChange{cid: c, change: ch}
			visited[vc.cid] = struct{}{}
			for _, dep := range vc.change.Deps {
				has, err := bs.Has(ctx, dep)
				if err != nil {
					return fmt.Errorf("failed to check parent %s of %s: %w", dep, c, err)
				}
				_, seen := visited[dep]
				if !has && !seen {
					return fmt.Errorf("won't sync object %s: missing parent %s of change %s", obj, dep, c)
				}
			}

			changeBlob, err := hyper.EncodeBlob(vc.change)
			if err != nil {
				return err
			}

			if !changeBlob.CID.Equals(vc.cid) {
				return fmt.Errorf("reencoded change CID must match")
			}

			if err := s.blobs.SaveBlob(ctx, changeBlob); err != nil {
				return fmt.Errorf("failed to save synced change: %w", err)
			}
		}
	}

	return nil
}

// SyncAllBlobs is the alternative dumb syncing method, which just syncs all the blob from the remote peer.
func (s *Service) SyncAllBlobs(ctx context.Context, pid peer.ID) error {
	// Can't sync with self.
	if s.me.DeviceKey().PeerID() == pid {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, time.Second*40) // arbitrary timeout
	defer cancel()

	c, err := s.client(ctx, pid)
	if err != nil {
		return err
	}

	stream, err := c.ListBlobs(ctx, &p2p.ListBlobsRequest{})
	if err != nil {
		return err
	}

	pk, err := pid.ExtractPublicKey()
	if err != nil {
		return fmt.Errorf("failed to extract public key from peer id %s: %w", pid, err)
	}

	remotePrincipal := core.PrincipalFromPubKey(pk)

	bs := s.blobs.IPFSBlockstore()

	type wantBlob struct {
		cid    cid.Cid
		cursor string
	}

	var want []wantBlob
	for {
		obj, err := stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return err
		}

		c, err := cid.Cast(obj.Cid)
		if err != nil {
			return err
		}

		ok, err := bs.Has(ctx, c)
		if err != nil {
			return fmt.Errorf("failed to check if we have blob %s: %w", c, err)
		}

		if !ok {
			want = append(want, wantBlob{cid: c, cursor: obj.Cursor})
			MSyncingWantBlobs.WithLabelValues("syncing").Inc()
		}
	}

	MSyncingWantBlobs.WithLabelValues("syncing").Set(float64(len(want)))
	defer MSyncingWantBlobs.WithLabelValues("syncing").Set(0)

	if len(want) == 0 {
		return nil
	}

	log := s.log.With(
		zap.String("remotePeer", pid.String()),
	)

	sess := s.bitswap.NewSession(ctx)
	var lastSavedCursor string
	for i, c := range want {
		blk, err := sess.GetBlock(ctx, c.cid)
		if err != nil {
			log.Debug("FailedToGetWantedBlob", zap.String("cid", c.cid.String()), zap.Error(err))
			continue
		}

		if err := bs.Put(ctx, blk); err != nil {
			log.Debug("FailedToSaveWantedBlob", zap.String("cid", c.cid.String()), zap.Error(err))
			continue
		}

		if i%50 == 0 {
			if err := SaveCursor(ctx, s.db, remotePrincipal, c.cursor); err != nil {
				return err
			}
			lastSavedCursor = c.cursor
		}
	}

	lastCursor := want[len(want)-1].cursor

	if lastSavedCursor != lastCursor {
		if err := SaveCursor(ctx, s.db, remotePrincipal, lastCursor); err != nil {
			return err
		}
	}

	return nil
}

// SyncWithPeer syncs all documents from a given peer. given no initial objectsOptionally.
// if a list a list of initialObjects is provided, then only syncs objects from that list.
func (s *Service) SyncWithPeer(ctx context.Context, device peer.ID, initialObjects ...hyper.EntityID) error {
	// Can't sync with self.
	if s.me.DeviceKey().PeerID() == device {
		return nil
	}

	if initialObjects == nil {
		return s.SyncAllBlobs(ctx, device)
	}

	var filter map[hyper.EntityID]struct{}
	if initialObjects != nil {
		filter = make(map[hyper.EntityID]struct{}, len(initialObjects))
		for _, o := range initialObjects {
			filter[o] = struct{}{}
		}
	}

	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()

	c, err := s.client(ctx, device)
	if err != nil {
		return err
	}

	remoteObjs, err := c.ListObjects(ctx, &p2p.ListObjectsRequest{})
	if err != nil {
		return err
	}

	// If only selected objects are requested to sync we filter them out here.
	var finalObjs []*p2p.Object
	if filter == nil {
		finalObjs = remoteObjs.Objects
	} else {
		for _, obj := range remoteObjs.Objects {
			_, ok := filter[hyper.EntityID(obj.Id)]
			if !ok {
				continue
			}
			finalObjs = append(finalObjs, obj)
		}
	}

	s.log.Debug("Syncing", zap.Int("remoteObjects", len(remoteObjs.Objects)), zap.Int("initialObjects", len(initialObjects)), zap.Int("finalObjects", len(finalObjs)))

	sess := s.bitswap.NewSession(ctx)
	for _, obj := range finalObjs {
		if err := s.syncObject(ctx, sess, obj); err != nil {
			return err
		}
	}
	return nil
}

// GetCursor from the last sync with the given peer.
func GetCursor[T *sqlite.Conn | *sqlitex.Pool](ctx context.Context, db T, peer core.Principal) (cursor string, err error) {
	var conn *sqlite.Conn
	switch v := any(db).(type) {
	case *sqlite.Conn:
		conn = v
	case *sqlitex.Pool:
		c, release, err := v.Conn(ctx)
		if err != nil {
			return "", err
		}
		defer release()
		conn = c
	}

	err = sqlitex.Exec(conn, qGetCursor(), func(stmt *sqlite.Stmt) error {
		cursor = stmt.ColumnText(0)
		return nil
	}, peer)
	return cursor, err
}

var qGetCursor = dqb.Str(`
	SELECT cursor
	FROM syncing_cursors
	WHERE peer = (
		SELECT id
		FROM public_keys
		WHERE principal = ?
	)
	LIMIT 1;
`)

// SaveCursor for the given peer.
func SaveCursor[T *sqlite.Conn | *sqlitex.Pool](ctx context.Context, db T, peer core.Principal, cursor string) error {
	var conn *sqlite.Conn
	switch v := any(db).(type) {
	case *sqlite.Conn:
		conn = v
	case *sqlitex.Pool:
		c, release, err := v.Conn(ctx)
		if err != nil {
			return err
		}
		defer release()
		conn = c
	}

	return sqlitex.Exec(conn, qSaveCursor(), nil, peer, cursor)
}

var qSaveCursor = dqb.Str(`
	INSERT OR REPLACE INTO syncing_cursors (peer, cursor)
	VALUES (
		(SELECT id FROM public_keys WHERE principal = :peer),
		:cursor
	);
`)
