package syncing

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/backlinks"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcsdb"
	"mintter/backend/vcs/vcssql"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

// NetDialFunc is a function of the Mintter P2P node that creates an instance
// of a P2P RPC client for a given remote Device ID.
type NetDialFunc func(context.Context, cid.Cid) (p2p.P2PClient, error)

// FetcherFunc is a subset of the Bitswap protocol that creates a Session for fetching
// blocks from the network.
type FetcherFunc func(context.Context) exchange.Fetcher

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

	// onStart is a callback function which is called when the service is started.
	onStart func(context.Context) error
	// onSync is a callback function which is called after a single sync loop.
	onSync func(SyncResult) error

	log     *zap.Logger
	vcs     *vcsdb.DB
	me      core.Identity
	bitswap FetcherFunc
	client  NetDialFunc

	mu sync.Mutex // Ensures only one sync loop is running at a time.
}

const (
	defaultWarmupDuration  = time.Minute
	defaultSyncInterval    = time.Minute
	defaultPeerSyncTimeout = time.Minute * 5
)

// NewService creates a new syncing service. Users must call Start() to start the periodic syncing.
func NewService(log *zap.Logger, me core.Identity, vcs *vcsdb.DB, bitswap FetcherFunc, client NetDialFunc) *Service {
	svc := &Service{
		warmupDuration:  defaultWarmupDuration,
		syncInterval:    defaultSyncInterval,
		peerSyncTimeout: defaultPeerSyncTimeout,

		log:     log,
		vcs:     vcs,
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

// OnStart sets a callback which is called when the service is started by calling Start().
// Must be called before calling Start(), and multiple callbacks will be called in FIFO order.
func (s *Service) OnStart(fn func(context.Context) error) {
	old := s.onStart
	s.onStart = func(ctx context.Context) error {
		if old != nil {
			if err := old(ctx); err != nil {
				return err
			}
		}
		if err := fn(ctx); err != nil {
			return err
		}
		return nil
	}
}

// OnSync sets a callback which is called after each sync iteration.
// Must be called before calling Start(), and multiple callbacks will be called in FIFO order.
func (s *Service) OnSync(fn func(SyncResult) error) {
	old := s.onSync
	s.onSync = func(res SyncResult) error {
		if old != nil {
			if err := old(res); err != nil {
				return err
			}
		}
		if err := fn(res); err != nil {
			return err
		}
		return nil
	}
}

// Start the syncing service which will periodically perform global sync loop.
func (s *Service) Start(ctx context.Context) (err error) {
	s.log.Debug("SyncingServiceStarted")
	defer func() {
		s.log.Debug("SyncingServiceFinished", zap.Error(err))
	}()

	t := time.NewTimer(s.warmupDuration)

	if s.onStart != nil {
		if err := s.onStart(ctx); err != nil {
			return err
		}
	}

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
	log := s.log.With(zap.Int64("traceID", time.Now().Unix()))

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
				zap.String("device", res.Devices[i].String()),
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
	Devices       []cid.Cid
	Errs          []error
}

// Sync attempts to sync the objects with connected peers.
func (s *Service) Sync(ctx context.Context) (res SyncResult, err error) {
	if !s.mu.TryLock() {
		return res, ErrSyncAlreadyRunning
	}
	defer s.mu.Unlock()

	conn, release, err := s.vcs.DB().Conn(ctx)
	if err != nil {
		return res, err
	}
	devices, err := vcssql.DevicesList(conn)
	release()
	if err != nil {
		return res, err
	}

	res.Devices = make([]cid.Cid, len(devices))
	res.Errs = make([]error, len(devices))

	var wg sync.WaitGroup

	wg.Add(len(devices))

	for i, dev := range devices {
		go func(i int, dev vcssql.DevicesListResult) {
			defer wg.Done()

			ctx, cancel := context.WithTimeout(ctx, s.peerSyncTimeout)
			defer cancel()

			did := cid.NewCidV1(core.CodecDeviceKey, dev.DevicesMultihash)
			res.Devices[i] = did

			// Can't sync with self.
			if s.me.DeviceKey().CID().Equals(did) {
				return
			}

			err := s.SyncWithPeer(ctx, did)
			res.Errs[i] = err

			if err == nil {
				atomic.AddInt64(&res.NumSyncOK, 1)
			} else {
				atomic.AddInt64(&res.NumSyncFailed, 1)
			}
		}(i, dev)
	}

	wg.Wait()

	if s.onSync != nil {
		if err := s.onSync(res); err != nil {
			return res, err
		}
	}

	return res, nil
}

func (s *Service) syncFromVersion(ctx context.Context, acc, device, oid cid.Cid, sess exchange.Fetcher, remoteVer vcs.Version) error {
	bs := s.vcs.Blockstore()

	var permanode vcs.Permanode
	var shouldStorePermanode bool
	var ep vcsdb.EncodedPermanode
	{
		// Important to check before using bitswap, because it would add the fetched block into out blockstore,
		// without any mintter-specific indexing.
		has, err := bs.Has(ctx, oid)
		if err != nil {
			return err
		}

		// Indicate to the bitswap session to prefer peers who have the permanode block.
		perma, err := sess.GetBlock(ctx, oid)
		if err != nil {
			return err
		}

		// CBOR decoder will complain if struct has missing fields, so we can't use BasePermanode here,
		// and instead have to use a map. It's pain in the butt.
		// TODO: fix this!
		var v interface{}
		if err := cbornode.DecodeInto(perma.RawData(), &v); err != nil {
			return err
		}

		p, err := permanodeFromMap(v)
		if err != nil {
			return err
		}

		permanode = p

		if !has {
			shouldStorePermanode = true
			ep = vcsdb.EncodedPermanode{
				ID:        perma.Cid(),
				Data:      perma.RawData(),
				Permanode: permanode,
			}
		}
	}

	remoteChanges, err := fetchMissingChanges(ctx, bs, oid, sess, remoteVer)
	if err != nil {
		return fmt.Errorf("failed to fetch missing changes: %w", err)
	}

	if remoteChanges == nil {
		return nil
	}

	conn, release, err := s.vcs.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		var obj vcsdb.LocalID
		if shouldStorePermanode {
			obj = conn.NewObject(ep)
		} else {
			obj = conn.LookupPermanode(oid)
		}

		idLocal := conn.EnsureAccountDevice(acc, device)
		newHeads := remoteVer.CIDs()
		newLocalVersion := make(vcsdb.LocalVersion, len(newHeads))
		trackHead := func(c cid.Cid, lid vcsdb.LocalID) {
			for i, h := range newHeads {
				if h.Equals(c) {
					newLocalVersion[i] = lid
				}
			}
		}

		for _, remote := range remoteChanges {
			local := conn.StoreRemoteChange(obj, remote, backlinks.IndexDatom)
			trackHead(remote.Cid(), local)
		}

		conn.SaveVersion(obj, "main", idLocal, newLocalVersion)

		return nil
	}); err != nil {
		return err
	}

	return nil
}

// SyncWithPeer syncs all documents from a given peer.
func (s *Service) SyncWithPeer(ctx context.Context, device cid.Cid) error {
	c, err := s.client(ctx, device)
	if err != nil {
		return err
	}

	resp, err := c.ListObjects(ctx, &p2p.ListObjectsRequest{})
	if err != nil {
		return err
	}

	sess := s.bitswap(ctx)
	for _, obj := range resp.Objects {
		oid, err := cid.Decode(obj.Id)
		if err != nil {
			return err
		}

		for _, ver := range obj.VersionSet {
			vv, err := vcs.ParseVersion(ver.Version)
			if err != nil {
				return err
			}
			// TODO: pass in identity information of the remote version, not our own.
			if err := s.syncFromVersion(ctx, s.me.AccountID(), s.me.DeviceKey().CID(), oid, sess, vv); err != nil {
				return err
			}
		}
	}
	return nil
}

func permanodeFromMap(v interface{}) (p vcs.Permanode, err error) {
	defer func() {
		if stack := recover(); stack != nil {
			err = multierr.Append(err, fmt.Errorf("failed to convert map into permanode: %v", stack))
		}
	}()

	var base vcs.BasePermanode

	base.Type = vcs.ObjectType(v.(map[string]interface{})["@type"].(string))
	base.Owner = v.(map[string]interface{})["owner"].(cid.Cid)
	t := v.(map[string]interface{})["createTime"].(string)

	tt, err := time.ParseInLocation(time.RFC3339, t, time.UTC)
	if err != nil {
		return nil, fmt.Errorf("failed to parse permanode create time: %w", err)
	}

	base.CreateTime = tt

	return base, nil
}

type verifiedChange = vcsdb.VerifiedChange

func fetchMissingChanges(ctx context.Context, bs blockstore.Blockstore, obj cid.Cid, sess exchange.Fetcher, ver vcs.Version) ([]verifiedChange, error) {
	queue := ver.CIDs()

	visited := make(map[cid.Cid]struct{}, ver.TotalCount())

	fetched := make([]verifiedChange, 0, 10) // Arbitrary buffer to reduce allocations when buffer grows.

	for len(queue) > 0 {
		last := len(queue) - 1
		id := queue[last]
		queue = queue[:last]

		has, err := bs.Has(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to check if change %s is present: %w", id, err)
		}

		// Stop if we've seen this node already or we have it stored locally.
		if _, ok := visited[id]; ok || has {
			continue
		}

		blk, err := sess.GetBlock(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch change %s: %w", id, err)
		}

		vc, err := vcsdb.VerifyChangeBlock(blk)
		if err != nil {
			return nil, err
		}

		if !vc.Decoded.Payload.Object.Equals(obj) {
			return nil, fmt.Errorf("change for unrelated object: got = %s, want = %s", vc.Decoded.Payload.Object, obj)
		}

		fetched = append(fetched, vc)

		visited[id] = struct{}{}

		for _, p := range vc.Decoded.Payload.Parents {
			queue = append(queue, p)
		}
	}

	// Avoid returning preallocated slice if we never ended up discovering new blocks to fetch.
	if len(fetched) == 0 {
		return nil, nil
	}

	sort.Slice(fetched, func(i, j int) bool {
		return fetched[i].Decoded.Payload.LamportTime < fetched[j].Decoded.Payload.LamportTime
	})

	return fetched, nil
}
