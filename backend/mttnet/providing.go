package mttnet

import (
	"context"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/logging"
	"mintter/backend/pkg/dqb"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/boxo/provider"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
)

var qAllPublicBlobs = dqb.Str(`
	SELECT
		blobs.codec,
		blobs.multihash
	FROM blobs
	LEFT OUTER JOIN drafts ON drafts.blob = blobs.id
	WHERE blobs.size >= 0
	AND drafts.blob IS NULL;
`)

func makeProvidingStrategy(db *sqlitex.Pool) provider.KeyChanFunc {
	// This providing strategy returns all the CID known to the blockstore
	// except those which are marked as draft changes.
	// TODO(burdiyan): this is a temporary solution during the braking change.

	log := logging.New("mintter/reprovider", "debug")

	return func(ctx context.Context) (<-chan cid.Cid, error) {
		ch := make(chan cid.Cid, 30) // arbitrary buffer

		go func() {
			defer close(ch)

			conn, release, err := db.Conn(ctx)
			if err != nil {
				log.Error("Failed to open db connection", zap.Error(err))
				return
			}
			defer release()

			var (
				codec     int
				multihash []byte
			)

			if err := sqlitex.Exec(conn, qAllPublicBlobs(), func(stmt *sqlite.Stmt) error {
				stmt.Scan(&codec, &multihash)

				select {
				case <-ctx.Done():
					return ctx.Err()
				case ch <- cid.NewCidV1(uint64(codec), multihash):
					// Send OK.
				}

				return nil
			}); err != nil {
				log.Error("Failed to read db record", zap.Error(err))
				return
			}

			// We want to provide all the entity IDs, so we convert them into raw CIDs,
			// similar to how libp2p discovery service is doing.

			entities, err := hypersql.EntitiesListByPrefix(conn, "*")
			if err != nil {
				log.Error("Failed to list entities", zap.Error(err))
				return
			}

			for _, e := range entities {
				c, err := hyper.EntityID(e.EntitiesEID).CID()
				if err != nil {
					log.Warn("BadEntityID", zap.Error(err), zap.String("entity", e.EntitiesEID))
					return
				}

				select {
				case <-ctx.Done():
					return
				case ch <- c:
					log.Debug("Reproviding", zap.String("entity", e.EntitiesEID), zap.String("CID", c.String()))
					// Send OK.
				}
			}
		}()
		return ch, nil
	}
}
