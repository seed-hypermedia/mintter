package syncing

import (
	"context"
	"hash/fnv"
	"seed/backend/config"
	"sync"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/boxo/blockstore"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"go.uber.org/zap"
)

type worker struct {
	cfg        config.Syncing
	pid        peer.ID
	log        *zap.Logger
	clientFunc netDialFunc
	host       host.Host
	bs         blockstore.Blockstore
	bswap      bitswap
	db         *sqlitex.Pool
	sema       chan struct{}

	// stop is assigned during start().
	stop context.CancelFunc
}

func newWorker(
	cfg config.Syncing,
	pid peer.ID,
	log *zap.Logger,
	clientFunc netDialFunc,
	host host.Host,
	bs blockstore.Blockstore,
	bswap bitswap,
	db *sqlitex.Pool,
	semaphore chan struct{},
) *worker {
	log = log.With(
		zap.String("peer", pid.String()),
	)
	return &worker{
		cfg:        cfg,
		pid:        pid,
		log:        log,
		clientFunc: clientFunc,
		host:       host,
		bs:         bs,
		bswap:      bswap,
		db:         db,
		sema:       semaphore,
	}
}

// start must be called in a separate goroutine with a correctly incremented WaitGroup.
func (sw *worker) start(ctx context.Context, wg *sync.WaitGroup, interval time.Duration) {
	ctx, cancel := context.WithCancel(ctx)
	sw.stop = cancel

	defer wg.Done()

	// We run this loop on every interval, even if we are in the middle of a backoff "sleep" to resolve the peer's address.
	// This is to make sure we continue syncing when the peer comes back online. It's easier to just run the loop on every interval,
	// instead of implementing a special waking up process for the goroutine that is asleep during the backoff.
	//
	// The worker loop is roughly modeled as the following state machine.
	// You can inspect it interactively at https://sketch.systems by copy-pasting the following text.

	/*
		Sync Worker
		  CheckConnection*
		    connected -> Syncing
		    not connected -> Backoff
		  # On enter: try to connect.
		  # If it's first time ever — connect right away.
		  # Otherwise — connect respecting the semaphore.
		  Connecting
		    online -> Syncing
		    offline -> Sleeping
		    # On transition:
		    # attempts++
		    # deadline = nextDeadline()
		    no addrs -> Backoff
		  # On enter: start syncing.
		  # attempts = 0
		  # deadline = None
		  Syncing
		    sync done -> Sleeping
		  # On enter: check deadline.
		  Backoff
		    deadline exceeded -> Connecting
		    deadline not reached -> Sleeping
		  # On enter: reset timer.
		  Sleeping
		    tick -> CheckConnection
	*/

	type workerState uint8

	const (
		sCheckConnection workerState = iota
		sConnecting
		sSyncing
		sBackoff
		sSleeping
	)

	t := time.NewTimer(offsetInterval(sw.pid, interval))
	defer t.Stop()

	var (
		attempts = -1
		deadline time.Time
	)

	for {
		select {
		case <-ctx.Done():
			return
		case tick := <-t.C:
			state := sCheckConnection

		FSM:
			for {
				switch state {
				case sCheckConnection:
					ps := sw.getPeerState()
					if ps == peerStateOnline {
						state = sSyncing
					} else {
						state = sBackoff
					}
				case sConnecting:
					switch sw.maybeConnect(ctx, attempts) {
					case peerStateOnline:
						state = sSyncing
					case peerStateOffline:
						state = sSleeping
					case peerStateNoAddr:
						// The first attempt is -1 to avoid using the semaphore for the first time,
						// but we don't want to use 0 for calculating the next deadline, so we use at least 1.
						attempts = max(1, attempts+1)
						deadline = time.Now().Add(interval * 1 << attempts) // exponential backoff.
						state = sBackoff
					}
				case sSyncing:
					attempts = 0
					deadline = time.Time{}
					sw.sync(ctx)
					state = sSleeping
				case sBackoff:
					if time.Now().Before(deadline) {
						state = sSleeping
					} else {
						state = sConnecting
					}
				case sSleeping:
					t.Reset(interval)
					break FSM
				default:
					panic("BUG: invalid worker state")
				}
			}

			mSyncingTickDuration.Observe(time.Since(tick).Seconds())
		}
	}
}

func (sw *worker) sync(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, sw.cfg.TimeoutPerPeer)
	defer cancel()

	c, err := sw.clientFunc(ctx, sw.pid)
	if err != nil {
		sw.log.Debug("FailedToGetClient", zap.Error(err))
		return
	}

	sess := sw.bswap.NewSession(ctx)

	if err := syncPeer(ctx, sw.pid, c, sw.bs, sess, sw.db, sw.log); err != nil {
		sw.log.Debug("FailedToSync", zap.Error(err))
	}
}

// maybeConnect tries to maybeConnect to the peer, backing off unless it's a first attempt.
func (sw *worker) maybeConnect(ctx context.Context, attempts int) peerState {
	mConnectsInFlight.Inc()
	defer mConnectsInFlight.Dec()

	state := sw.getPeerState()
	switch state {
	case peerStateOnline:
		return state
	case peerStateOffline:
		// We can connect right away if we know some addresses to connect.
		break
	case peerStateNoAddr:
		// We want to connect right away the first time we start the worker (attempt = -1)
		if attempts == -1 {
			break
		}

		// Otherwise we want to limit the concurrency for DHT peer routing requests.
		// So we acquire a semaphore to avoid the thundering herd problem.
		select {
		case <-ctx.Done():
			return peerStateNoAddr
		case sw.sema <- struct{}{}:
			defer func() {
				<-sw.sema
			}()
		}
	default:
		panic("BUG: invalid peer state")
	}

	ctx, cancel := context.WithTimeout(ctx, connectTimeout)
	defer cancel()

	if err := sw.host.Connect(ctx, peer.AddrInfo{ID: sw.pid}); err != nil {
		sw.log.Debug("FailedToConnect", zap.Error(err))
		return sw.getPeerState()
	}

	return peerStateOnline
}

type peerState uint8

const (
	peerStateNoAddr peerState = iota
	peerStateOnline
	peerStateOffline
)

func (sw *worker) getPeerState() peerState {
	if sw.host.Network().Connectedness(sw.pid) == network.Connected {
		return peerStateOnline
	}

	addrs := sw.host.Peerstore().Addrs(sw.pid)

	if len(addrs) > 0 {
		return peerStateOffline
	}

	return peerStateNoAddr
}

func offsetInterval(pid peer.ID, interval time.Duration) time.Duration {
	// Borrowed from the Prometheus code base.
	// The idea here is to offset the beginning of a periodic task
	// to spread the load for multiple tasks within the interval.
	// See https://github.com/prometheus/prometheus/blob/c3b8ef1694ffd1ef4325eace32c6e3dddca8e710/scrape/target.go#L155.

	now := time.Now().UnixNano()

	var hash uint64
	{
		h := fnv.New64a()
		h.Write([]byte(pid))
		hash = h.Sum64()
	}

	var (
		base   = int64(interval) - now%int64(interval)
		offset = hash % uint64(interval)
		next   = base + int64(offset)
	)

	if next > int64(interval) {
		next -= int64(interval)
	}

	return time.Duration(next)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
