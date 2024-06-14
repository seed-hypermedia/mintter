package mttnet

import (
	"context"
	"math/rand"
	"seed/backend/hyper"
	"seed/backend/hyper/hypersql"
	"seed/backend/logging"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/boxo/provider"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
)

var randSrc = rand.NewSource(time.Now().UnixNano())

func makeProvidingStrategy(db *sqlitex.Pool, logLevel string) provider.KeyChanFunc {
	// This providing strategy returns all the CID known to the blockstore
	// except those which are marked as draft changes.
	// TODO(burdiyan): this is a temporary solution during the braking change.

	log := logging.New("seed/reprovider", logLevel)

	return func(ctx context.Context) (<-chan cid.Cid, error) {
		ch := make(chan cid.Cid, 30) // arbitrary buffer

		go func() {
			defer close(ch)

			conn, release, err := db.Conn(ctx)
			if err != nil {
				log.Error("Failed to open db connection", zap.Error(err))
				return
			}

			// We want to provide all the entity IDs, so we convert them into raw CIDs,
			// similar to how libp2p discovery service is doing.

			entities, err := hypersql.EntitiesListByPrefix(conn, "*")
			release()
			if err != nil {
				log.Error("Failed to list entities", zap.Error(err))
				return
			}
			log.Info("Start reproviding", zap.Int("Number of entities", len(entities)))
			// Since reproviding takes long AND is has throttle limits, we are better off randomizing it.
			r := rand.New(randSrc) //nolint:gosec
			r.Shuffle(len(entities), func(i, j int) { entities[i], entities[j] = entities[j], entities[i] })
			for _, e := range entities {
				c, err := hyper.EntityID(e.ResourcesIRI).CID()
				if err != nil {
					log.Warn("BadEntityID", zap.Error(err), zap.String("entity", e.ResourcesIRI))
					return
				}

				select {
				case <-ctx.Done():
					log.Info("Reproviding context cancelled")
					return
				case ch <- c:
					// Send
					log.Debug("Reproviding", zap.String("entity", e.ResourcesIRI), zap.String("CID", c.String()))
				}
			}
			log.Info("Finish reproviding", zap.Int("Number of entities", len(entities)))
		}()
		return ch, nil
	}
}
