// Package syncing syncs content with remote peers.
package syncing

import (
	"context"
	"seed/backend/hyper"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const defaultDiscoveryTimeout = time.Second * 30

// DiscoverObject attempts to discover a given Hyper Media Object with an optional version specified.
// If no version is specified it tries to find whatever is possible.
func (s *Service) DiscoverObject(ctx context.Context, obj hyper.EntityID, ver hyper.Version) error {
	// TODO(burdiyan): if we know the version, there's no need to finding provider peers
	// for the permanode, we could be just looking for the leaf change CIDs, and walk up the
	// change DAG. We are doing almost exactly that inside the syncFromVersion() method.

	if s.cfg.NoDiscovery {
		return status.Error(codes.FailedPrecondition, "remote content discovery is disabled")
	}

	ctx, cancel := context.WithTimeout(ctx, defaultDiscoveryTimeout)
	defer cancel()

	c, err := obj.CID()
	if err != nil {
		return err
	}

	// Arbitrary number of maximum providers
	maxProviders := 15

	// If we are looking for a specific version, we don't need to limit the number of providers,
	// because we will short-circuit as soon as we found the desired version.
	if ver != "" {
		maxProviders = 0
	}

	//TODO(juligasa): create a bitswap session, get the version block and try to find who served it. Connect and sync everything
	peers := s.bitswap.FindProvidersAsync(ctx, c, maxProviders)

	var wg sync.WaitGroup

	for p := range peers {
		p := p
		wg.Add(1)
		go func() {
			defer wg.Done()
			log := s.log.With(
				zap.String("entity", string(obj)),
				zap.String("CID", c.String()),
				zap.String("peer", p.String()),
			)
			log.Debug("DiscoveredProvider")
			if err := s.SyncWithPeer(ctx, p.ID); err != nil {
				log.Debug("FinishedSyncingWithProvider", zap.Error(err))
				return
			}

			// We could indicate other goroutines to stop whenever we found what we wanted.
			// But we can only safely do that if know the exact version we wanted. Otherwise,
			// we probably should wait until we've synced with all the other peers.
			if ver == "" {
				return
			}

			heads, err := ver.Parse()
			if err != nil {
				log.Debug("FailedToParseVersion", zap.String("version", ver.String()))
				return
			}

			ok, err := s.hasBlocks(ctx, heads...)
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
		ok, err := s.blobs.IPFSBlockstoreReader().Has(ctx, c)
		if err != nil {
			return false, err
		}
		if !ok {
			return false, nil
		}
	}
	return true, nil
}
