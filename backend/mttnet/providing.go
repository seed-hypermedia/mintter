package mttnet

import (
	"context"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/logging"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
)

func makeProvidingStrategy(db *sqlitex.Pool) ipfs.ReprovidingStrategy {
	// This providing strategy returns all the CID known to the blockstore
	// except those which are marked as draft changes.
	// TODO(burdiyan): this is a temporary solution during the braking change.

	log := logging.New("mintter/reprovider", "debug")
	const q = `
SELECT
	` + sqliteschema.C_PublicBlobsCodec + `,
	` + sqliteschema.C_PublicBlobsMultihash + `
FROM ` + sqliteschema.T_PublicBlobs + `;`

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

			if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
				stmt.Scan(&codec, &multihash)
				ch <- cid.NewCidV1(uint64(codec), multihash)
				return nil
			}); err != nil {
				log.Error("Failed to read db record", zap.Error(err))
				return
			}

		}()

		return ch, nil
	}
}
