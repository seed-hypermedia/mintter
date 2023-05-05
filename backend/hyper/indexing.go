package hyper

import (
	"fmt"
	"mintter/backend/core"
	"mintter/backend/hyper/hypersql"

	"crawshaw.io/sqlite"
	"go.uber.org/zap"
)

// indexBlob is a uber-function that knows about all types of blobs we want to index.
// This is probably a bad idea to put here, but for now it's easier to work with that way.
// TODO(burdiyan): eventually we might want to make this package agnostic to blob types.
func (bs *Storage) indexBlob(conn *sqlite.Conn, id int64, blob Blob) error {
	switch v := blob.Decoded.(type) {
	case KeyDelegation:
		iss, err := bs.ensurePublicKey(conn, v.Issuer)
		if err != nil {
			return err
		}

		del, err := bs.ensurePublicKey(conn, v.Delegate)
		if err != nil {
			return err
		}

		if v.Purpose != DelegationPurposeRegistration {
			bs.log.Warn("UnknownKeyDelegationPurpose", zap.String("purpose", v.Purpose))
		} else {
			_, err := hypersql.EntitiesInsertOrIgnore(conn, string(NewEntityID("mintter:account", v.Issuer.String())))
			if err != nil {
				return err
			}
		}

		if _, err := hypersql.KeyDelegationsInsertOrIgnore(conn, id, iss, del, v.NotBeforeTime.Unix()); err != nil {
			return err
		}
	case Change:
		// ensure entity
		res, err := hypersql.EntitiesInsertOrIgnore(conn, string(v.Entity))
		if err != nil {
			return err
		}
		eid := res.HyperEntitiesID
		if eid == 0 {
			res, err := hypersql.EntitiesLookupID(conn, string(v.Entity))
			if err != nil {
				return err
			}
			if res.HyperEntitiesID == 0 {
				panic("BUG: entity ID is not found after insert")
			}
			eid = res.HyperEntitiesID
		}

		for _, dep := range v.Deps {
			res, err := hypersql.BlobsGetSize(conn, dep.Hash())
			if err != nil {
				return err
			}
			if res.BlobsSize < 0 {
				return fmt.Errorf("missing causal dependency %s of change %s", dep, blob.CID)
			}

			if err := hypersql.LinksInsert(conn, id, "change:depends", res.BlobsID, 0, nil); err != nil {
				return fmt.Errorf("failed to link dependency %s of change %s", dep, blob.CID)
			}
		}

		if err := hypersql.ChangesInsertOrIgnore(conn, id, eid, v.HLCTime.Pack()); err != nil {
			return err
		}
	}

	return nil
}

func (bs *Storage) ensurePublicKey(conn *sqlite.Conn, key core.Principal) (int64, error) {
	res, err := hypersql.PublicKeysLookupID(conn, key)
	if err != nil {
		return 0, err
	}

	if res.PublicKeysID > 0 {
		return res.PublicKeysID, nil
	}

	ins, err := hypersql.PublicKeysInsert(conn, key)
	if err != nil {
		return 0, err
	}

	if ins.PublicKeysID <= 0 {
		panic("BUG: failed to insert key for some reason")
	}

	return ins.PublicKeysID, nil
}

func inferBlob(v any) (hb Blob, err error) {
	return
}
