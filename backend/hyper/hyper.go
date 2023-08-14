// Package hyper implements Mintter Hypermedia System.
package hyper

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/fxamacker/cbor/v2"
	"github.com/ipfs/boxo/blockstore"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multicodec"
	"github.com/multiformats/go-multihash"
	"github.com/sanity-io/litter"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

// BlobType is a named type for Mintter Terra Blobs.
type BlobType string

// Storage is an indexing blob storage.
type Storage struct {
	db  *sqlitex.Pool
	bs  *blockStore
	log *zap.Logger
}

// NewStorage creates a new blob storage.
func NewStorage(db *sqlitex.Pool, log *zap.Logger) *Storage {
	return &Storage{
		db:  db,
		bs:  newBlockstore(db),
		log: log,
	}
}

// Query allows to execute raw SQLite queries.
func (bs *Storage) Query(ctx context.Context, fn func(conn *sqlite.Conn) error) (err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	if err := sqlitex.ExecTransient(conn, "PRAGMA query_only = on;", nil); err != nil {
		return err
	}
	defer func() {
		err = multierr.Combine(err, sqlitex.ExecTransient(conn, "PRAGMA query_only = off;", nil))
	}()

	return fn(conn)
}

// SaveBlob into the internal storage. Index if necessary.
func (bs *Storage) SaveBlob(ctx context.Context, blob Blob) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		id, exists, err := bs.bs.putBlock(conn, 0, uint64(blob.Codec), blob.Hash, blob.Data)
		if err != nil {
			return err
		}

		// No need to index if exists.
		if exists {
			return nil
		}

		if err := bs.indexBlob(conn, id, blob); err != nil {
			return fmt.Errorf("failed to index blob %s: %w", blob.CID, err)
		}

		return nil
	})
}

// SetAccountTrust sets an account to trusted.
func (bs *Storage) SetAccountTrust(ctx context.Context, acc []byte) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		return hypersql.SetAccountTrust(conn, acc)
	})
}

// UnsetAccountTrust untrust the provided account.
func (bs *Storage) UnsetAccountTrust(ctx context.Context, acc []byte) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		return hypersql.UnsetAccountTrust(conn, acc)
	})
}

func (bs *Storage) SaveDraftBlob(ctx context.Context, eid EntityID, blob Blob) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		id, exists, err := bs.bs.putBlock(conn, 0, uint64(blob.Codec), blob.Hash, blob.Data)
		if err != nil {
			return err
		}

		// No need to index if exists.
		if exists {
			return nil
		}

		if err := bs.indexBlob(conn, id, blob); err != nil {
			return fmt.Errorf("failed to index blob %s: %w", blob.CID, err)
		}

		resp, err := hypersql.EntitiesLookupID(conn, string(eid))
		if err != nil {
			return err
		}
		if resp.HDEntitiesID == 0 {
			panic("BUG: failed to lookup entity after inserting the blob")
		}

		return hypersql.DraftsInsert(conn, resp.HDEntitiesID, id)
	})
}

func (bs *Storage) ListEntities(ctx context.Context, prefix string) ([]EntityID, error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	resp, err := hypersql.EntitiesListByPrefix(conn, prefix+"*")
	if err != nil {
		return nil, err
	}

	out := make([]EntityID, len(resp))
	for i, r := range resp {
		out[i] = EntityID(r.HDEntitiesEID)
	}

	return out, nil
}

func (bs *Storage) PublishDraft(ctx context.Context, eid EntityID) (cid.Cid, error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return cid.Undef, err
	}
	defer release()

	var out cid.Cid
	if err := sqlitex.WithTx(conn, func() error {
		res, err := hypersql.DraftsGet(conn, string(eid))
		if err != nil {
			return err
		}
		if res.HDDraftsViewBlobID == 0 {
			return fmt.Errorf("no draft to publish for entity %s", eid)
		}

		if err := hypersql.DraftsDelete(conn, res.HDDraftsViewBlobID); err != nil {
			return err
		}

		out = cid.NewCidV1(uint64(res.HDDraftsViewCodec), res.HDDraftsViewMultihash)

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return cid.Undef, fmt.Errorf("BUG: got draft without CID")
	}

	return out, nil
}

func (bs *Storage) DeleteDraft(ctx context.Context, eid EntityID) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		res, err := hypersql.DraftsGet(conn, string(eid))
		if err != nil {
			return err
		}
		if res.HDDraftsViewBlobID == 0 {
			return fmt.Errorf("no draft to publish for entity %s", eid)
		}

		if err := hypersql.DraftsDelete(conn, res.HDDraftsViewBlobID); err != nil {
			return err
		}

		_, err = hypersql.BlobsDelete(conn, res.HDDraftsViewMultihash)
		if err != nil {
			return err
		}

		// Trying to delete the entity. It will fail if there're more changes left for it.
		err = hypersql.EntitiesDelete(conn, string(eid))
		if sqlite.ErrCode(err) == sqlite.SQLITE_CONSTRAINT_FOREIGNKEY {
			return nil
		}
		return err
	})
}

func (bs *Storage) DeleteEntity(ctx context.Context, eid EntityID) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		edb, err := hypersql.EntitiesLookupID(conn, string(eid))
		if err != nil {
			return err
		}
		if edb.HDEntitiesID == 0 {
			return fmt.Errorf("no such entity: %s", eid)
		}

		if err := hypersql.ChangesDeleteForEntity(conn, edb.HDEntitiesID); err != nil {
			return err
		}

		if err := hypersql.EntitiesDelete(conn, string(eid)); err != nil {
			return err
		}

		return nil
	})
}

func (bs *Storage) ReplaceDraftBlob(ctx context.Context, eid EntityID, old cid.Cid, blob Blob) error {
	if !old.Defined() {
		return fmt.Errorf("BUG: can't replace: old CID is not defined")
	}

	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		oldid, err := bs.bs.deleteBlock(conn, old)
		if err != nil {
			return err
		}

		id, exists, err := bs.bs.putBlock(conn, oldid, uint64(blob.Codec), blob.Hash, blob.Data)
		if err != nil {
			return fmt.Errorf("replace draft blob error when insert: %w", err)
		}

		// No need to index if exists.
		if exists {
			return nil
		}

		if err := bs.indexBlob(conn, id, blob); err != nil {
			return fmt.Errorf("failed to index blob %s: %w", blob.CID, err)
		}

		resp, err := hypersql.EntitiesLookupID(conn, string(eid))
		if err != nil {
			return err
		}
		if resp.HDEntitiesID == 0 {
			panic("BUG: failed to lookup entity after inserting the blob")
		}

		return hypersql.DraftsInsert(conn, resp.HDEntitiesID, id)
	})
}

func (bs *Storage) LoadBlob(ctx context.Context, c cid.Cid, v any) error {
	codec, _ := ipfs.DecodeCID(c)
	if codec != uint64(multicodec.DagCbor) {
		return fmt.Errorf("TODO: can't load non-cbor blobs")
	}

	blk, err := bs.bs.Get(ctx, c)
	if err != nil {
		return err
	}

	if err := cbornode.DecodeInto(blk.RawData(), v); err != nil {
		return fmt.Errorf("failed to decode CBOR blob %s: %w", c, err)
	}

	return nil
}

type IPFSBlockstoreReader interface {
	Has(context.Context, cid.Cid) (bool, error)
	Get(context.Context, cid.Cid) (blocks.Block, error)
	GetSize(context.Context, cid.Cid) (int, error)
}

func (bs *Storage) IPFSBlockstoreReader() IPFSBlockstoreReader {
	return bs.bs
}

func (bs *Storage) IPFSBlockstore() blockstore.Blockstore {
	return bs.bs
}

// Blob is a structural artifact.
type Blob struct {
	Type    BlobType
	CID     cid.Cid
	Codec   multicodec.Code
	Hash    multihash.Multihash
	Data    []byte
	Decoded any
}

// EncodeBlob produces a Blob from any object.
func EncodeBlob(t BlobType, v any) (hb Blob, err error) {
	data, err := cbornode.DumpObject(v)
	if err != nil {
		return hb, fmt.Errorf("failed to encode blob with type %s: %w", t, err)
	}

	codec := multicodec.DagCbor

	blk := ipfs.NewBlock(uint64(codec), data)
	c := blk.Cid()

	return Blob{
		Type:    t,
		CID:     c,
		Codec:   codec,
		Hash:    c.Hash(),
		Data:    data,
		Decoded: v,
	}, nil
}

var errNotHyperBlob = errors.New("not a hyper blob")

// DecodeBlob attempts to infer hyper Blob information from arbitrary IPFS block.
func DecodeBlob(c cid.Cid, data []byte) (hb Blob, err error) {
	codec := c.Prefix().Codec

	if codec != uint64(multicodec.DagCbor) {
		return hb, fmt.Errorf("%s: %w", c, errNotHyperBlob)
	}

	var v struct {
		Type string `cbor:"@type"`
	}
	if err := cbor.Unmarshal(data, &v); err != nil {
		var vv any
		if err := cbornode.DecodeInto(data, &vv); err != nil {
			panic(err)
		}
		litter.Dump(vv)

		return hb, fmt.Errorf("failed to infer hyper blob %s: %w", c, err)
	}

	switch BlobType(v.Type) {
	case TypeKeyDelegation:
		var v KeyDelegation
		if err := cbornode.DecodeInto(data, &v); err != nil {
			return hb, err
		}
		hb.Decoded = v
	case TypeChange:
		var v Change
		if err := cbornode.DecodeInto(data, &v); err != nil {
			return hb, err
		}
		hb.Decoded = v
	default:
		return hb, fmt.Errorf("unknown hyper blob type: '%s'", v.Type)
	}

	hb.Type = BlobType(v.Type)
	hb.CID = c
	hb.Codec = multicodec.Code(codec)
	hb.Hash = c.Hash()
	hb.Data = data

	return hb, nil
}
