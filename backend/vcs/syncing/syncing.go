package syncing

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ipfs/boxo/exchange"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/peer"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

// NetDialFunc is a function of the Mintter P2P node that creates an instance
// of a P2P RPC client for a given remote Device ID.
type NetDialFunc func(context.Context, cid.Cid) (p2p.P2PClient, error)

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

	// onStart is a callback function which is called when the service is started.
	onStart func(context.Context) error
	// onSync is a callback function which is called after a single sync loop.
	onSync func(SyncResult) error

	log     *zap.Logger
	vcs     *vcsdb.DB
	me      core.Identity
	bitswap Bitswap
	client  NetDialFunc

	// NoInbound disables syncing content from the remote peer to our peer.
	// If false, then documents get synced in both directions.
	NoInbound bool
	mu        sync.Mutex // Ensures only one sync loop is running at a time.
}

const (
	defaultWarmupDuration  = time.Minute
	defaultSyncInterval    = time.Minute
	defaultPeerSyncTimeout = time.Minute * 5
)

// NewService creates a new syncing service. Users must call Start() to start the periodic syncing.
func NewService(log *zap.Logger, me core.Identity, vcs *vcsdb.DB, bitswap Bitswap, client NetDialFunc, inDisable bool) *Service {
	svc := &Service{
		warmupDuration:  defaultWarmupDuration,
		syncInterval:    defaultSyncInterval,
		peerSyncTimeout: defaultPeerSyncTimeout,

		log:       log,
		vcs:       vcs,
		me:        me,
		bitswap:   bitswap,
		client:    client,
		NoInbound: inDisable,
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

func (s *Service) syncObject(ctx context.Context, sess exchange.Fetcher, obj *p2p.Object) error {
	ctx, cancel := context.WithTimeout(ctx, time.Minute)
	defer cancel()

	bs := s.vcs.Blockstore()

	oid, err := cid.Decode(obj.Id)
	if err != nil {
		return fmt.Errorf("can't sync object: failed to cast CID: %w", err)
	}

	var permanode vcs.Permanode
	var shouldStorePermanode bool
	var ep vcs.EncodedPermanode
	{
		// Important to check before using bitswap, because it would add the fetched block into our blockstore,
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
			ep = vcs.EncodedPermanode{
				ID:        perma.Cid(),
				Data:      perma.RawData(),
				Permanode: permanode,
			}
		}
	}

	// We have to check which of the remote changes we're actually missing to avoid
	// doing bitswap unnecessarily.
	var missingSorted []cid.Cid
	{
		for _, c := range obj.ChangeIds {
			cc, err := cid.Decode(c)
			if err != nil {
				return fmt.Errorf("failed to cast CID: %w", err)
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

	// Fetch missing changes and make sure we have their parents.
	// We assume causally sorted list, but verifying just in case.
	fetched := make([]vcs.VerifiedChange, len(missingSorted))
	visited := make(map[cid.Cid]struct{})
	{
		for i, c := range missingSorted {
			blk, err := sess.GetBlock(ctx, c)
			if err != nil {
				return fmt.Errorf("failed to sync blob %s: %w", c, err)
			}
			vc, err := vcs.VerifyChangeBlock(blk)
			if err != nil {
				return fmt.Errorf("failed to verify change %s: %w", c, err)
			}
			visited[vc.Cid()] = struct{}{}
			for _, dep := range vc.Decoded.Parents {
				has, err := bs.Has(ctx, dep)
				if err != nil {
					return fmt.Errorf("failed to check parent %s of %s: %w", dep, c, err)
				}
				_, seen := visited[dep]
				if !has && !seen {
					return fmt.Errorf("won't sync object %s: missing parent %s of change %s", obj, dep, c)
				}
			}
			fetched[i] = vc
		}
	}

	conn, release, err := s.vcs.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		if shouldStorePermanode {
			conn.NewObject(ep)
		}

		for _, vc := range fetched {
			conn.StoreChange(vc)
		}

		return nil
	}); err != nil {
		return err
	}

	return nil
}

// SyncWithPeer syncs all documents from a given peer. given no initial objectsOptionally.
// if a list a list of initialObjects is provided, then only syncs objects from that list.
func (s *Service) SyncWithPeer(ctx context.Context, device cid.Cid, initialObjects ...cid.Cid) error {
	// Can't sync with self.
	if s.me.DeviceKey().CID().Equals(device) {
		return nil
	}

	// Nodes such web sites can be configured to avoid automatic syncing with remote peers,
	// unless explicitly asked to sync some specific object IDs.
	if s.NoInbound && len(initialObjects) == 0 {
		return nil
	}

	var filter map[cid.Cid]struct{}
	if initialObjects != nil {
		filter = make(map[cid.Cid]struct{}, len(initialObjects))
		for _, o := range initialObjects {
			filter[o] = struct{}{}
		}
	}

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
			c, err := cid.Decode(obj.Id)
			if err != nil {
				s.log.Debug("WillNotSyncInvalidCID", zap.Error(err))
				continue
			}
			_, ok := filter[c]
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

func permanodeFromMap(v interface{}) (p vcs.Permanode, err error) {
	defer func() {
		if stack := recover(); stack != nil {
			err = multierr.Append(err, fmt.Errorf("failed to convert map into permanode: %v", stack))
		}
	}()

	var base vcs.BasePermanode

	base.Type = vcs.ObjectType(v.(map[string]interface{})["@type"].(string))
	base.Owner = v.(map[string]interface{})["owner"].(cid.Cid)
	t := v.(map[string]interface{})["createTime"].(int)

	base.CreateTime = hlc.Unpack(int64(t))

	return base, nil
}
