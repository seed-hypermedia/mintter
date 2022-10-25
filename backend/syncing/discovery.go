package syncing

import (
	"context"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"go.uber.org/zap"
)

const defaultDiscoveryTimeout = time.Minute

// DiscoverObject attempts to discover a given Mintter Object with an optional version specified.
// If no version is specified it tries to find whatever is possible.
func (s *Service) DiscoverObject(ctx context.Context, obj cid.Cid, version []cid.Cid) error {
	// TODO(burdiyan): if we know the version, there's no need to finding provider peers
	// for the permanode, we could be just looking for the leaf change CIDs, and walk up the
	// change DAG. We are doing almost exactly that inside the syncFromVersion() method.

	ctx, cancel := context.WithTimeout(ctx, defaultDiscoveryTimeout)
	defer cancel()

	const maxProviders = 3

	peers := s.bitswap.FindProvidersAsync(ctx, obj, maxProviders)

	var wg sync.WaitGroup

	for p := range peers {
		p := p
		device := peer.ToCid(p.ID)
		wg.Add(1)
		go func() {
			defer wg.Done()
			log := s.log.With(
				zap.String("object", obj.String()),
				zap.String("device", device.String()),
				zap.String("peer", p.String()),
			)
			log.Debug("DiscoveredProvider")
			if err := s.SyncWithPeer(ctx, device); err != nil {
				log.Debug("FinishedSyncingWithProvider", zap.Error(err))
				return
			}

			// We could indicate other goroutines to stop whenever we found what we wanted.
			// But we can only safely do that if know the exact version we wanted. Otherwise,
			// we probably should wait until we've synced with all the other peers.
			if version == nil {
				return
			}

			ok, err := s.hasBlocks(ctx, version...)
			if err != nil {
				log.Debug("FailedToCheckVersionAfterSync", zap.Error(err))
				return
			}
			if ok {
				cancel()
			}
		}()
	}

	wg.Wait()

	return nil
}

func (s *Service) hasBlocks(ctx context.Context, cids ...cid.Cid) (ok bool, err error) {
	for _, c := range cids {
		ok, err := s.vcs.Blockstore().Has(ctx, c)
		if err != nil {
			return false, err
		}
		if !ok {
			return false, nil
		}
	}
	return true, nil
}
