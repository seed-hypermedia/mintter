// Package hyper implements Seed Hypermedia System.
package hyper

import (
	"context"
	"errors"
	"fmt"
	"seed/backend/core"
	"seed/backend/hyper/hypersql"
	"seed/backend/ipfs"
	"seed/backend/pkg/dqb"
	"seed/backend/pkg/must"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/fxamacker/cbor/v2"
	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/ipfs/boxo/blockstore"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
	dagpb "github.com/ipld/go-codec-dagpb"
	"github.com/multiformats/go-multicodec"
	"go.uber.org/zap"
)

var (
	// ErrEntityNotFound used when looking for an entity not present in the database.
	ErrEntityNotFound = errors.New("entity not found")
)

// BlobType is a named type for Seed Terra Blobs.
type BlobType string

// Storage is an indexing blob storage.
type Storage struct {
	db  *sqlitex.Pool
	bs  *indexingBlockStore
	log *zap.Logger

	delegationCache *lru.Cache[cid.Cid, core.Principal]
	*indexer
}

// NewStorage creates a new blob storage.
func NewStorage(db *sqlitex.Pool, log *zap.Logger) *Storage {
	bs := newBlockstore(db)

	idx := &indexer{
		db:  db,
		log: log,
		bs:  bs,
	}

	return &Storage{
		db:              db,
		bs:              &indexingBlockStore{blockStore: bs, indexBlob: idx.indexBlob},
		log:             log,
		indexer:         idx,
		delegationCache: must.Do2(lru.New[cid.Cid, core.Principal](256)),
	}
}

// Query allows to execute raw SQLite queries.
func (bs *Storage) Query(ctx context.Context, fn func(conn *sqlite.Conn) error) (err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	// TODO(burdiyan): make the main database read-only.
	// This is commented because we want to allow writing into an attached in-memory database
	// while keeping the main database read-only. Apparently this is not possible in SQLite.
	// There're a bunch of other ways to achieve this but there's currently no time for implementing them.
	//
	// if err := sqlitex.ExecTransient(conn, "PRAGMA query_only = on;", nil); err != nil {
	// 	return err
	// }
	// defer func() {
	// 	err = multierr.Combine(err, sqlitex.ExecTransient(conn, "PRAGMA query_only = off;", nil))
	// }()

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
		_, err := bs.saveBlob(conn, blob)
		return err
	})
}

// saveBlob must be called within a transaction.
func (bs *Storage) saveBlob(conn *sqlite.Conn, blob Blob) (id int64, err error) {
	codec, hash := ipfs.DecodeCID(blob.CID)
	id, exists, err := bs.bs.putBlock(conn, 0, uint64(codec), hash, blob.Data)
	if err != nil {
		return 0, err
	}

	// No need to index if exists.
	if exists {
		return id, nil
	}

	if err := bs.indexBlob(conn, id, blob.CID, blob.Decoded); err != nil {
		return 0, fmt.Errorf("failed to index blob %s: %w", blob.CID, err)
	}

	return id, nil
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
		id, err := bs.saveBlob(conn, blob)
		if err != nil {
			return err
		}

		if id == 0 {
			panic("BUG: saveDraft: didn't save draft blob for some reason")
		}

		resp, err := hypersql.EntitiesLookupID(conn, string(eid))
		if err != nil {
			return err
		}
		if resp.ResourcesID == 0 {
			panic("BUG: saveDraft: failed to lookup entity after inserting the blob")
		}

		return hypersql.DraftsInsert(conn, resp.ResourcesID, id)
	})
}

// ListEntities returns a list of entities matching the pattern.
func (bs *Storage) ListEntities(ctx context.Context, pattern string) ([]EntityID, error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	resp, err := hypersql.EntitiesListByPrefix(conn, pattern)
	if err != nil {
		return nil, err
	}
	if len(resp) == 0 {
		return nil, nil
	}

	out := make([]EntityID, len(resp))
	for i, r := range resp {
		out[i] = EntityID(r.ResourcesIRI)
	}

	return out, nil
}

// ListTrustedEntities returns a list of entities matching the pattern owned by trusted accounts.
func (bs *Storage) ListTrustedEntities(ctx context.Context, pattern string) ([]EntityID, error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var out []EntityID
	if err := sqlitex.Exec(conn, qListTrustedEntitites(), func(stmt *sqlite.Stmt) error {
		out = append(out, EntityID(stmt.ColumnText(0)))
		return nil
	}, pattern); err != nil {
		return nil, err
	}

	return out, nil
}

var qListTrustedEntitites = dqb.Str(`
	SELECT resources.iri
	FROM trusted_accounts
	JOIN resources ON resources.owner = trusted_accounts.id
	WHERE resources.iri GLOB :prefix
	ORDER BY resources.id
`)

func (bs *Storage) GetDraft(ctx context.Context, eid EntityID) (ch Change, err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return ch, err
	}
	defer release()

	res, err := hypersql.DraftsGet(conn, string(eid))
	if err != nil {
		return ch, err
	}
	if res.DraftsViewBlobID == 0 {
		return ch, fmt.Errorf("no draft for entity %s", eid)
	}

	if err := bs.LoadBlob(ctx, cid.NewCidV1(uint64(res.DraftsViewCodec), res.DraftsViewMultihash), &ch); err != nil {
		return ch, err
	}

	return ch, nil
}

// PublishBlob publishes a blob.
func (bs *Storage) PublishBlob(ctx context.Context, c cid.Cid) (cid.Cid, error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return cid.Undef, err
	}
	defer release()

	var out cid.Cid
	if err := sqlitex.WithTx(conn, func() error {
		newID, err := allocateBlobID(conn)
		if err != nil {
			return err
		}

		res, err := hypersql.BlobsGet(conn, c.Hash())
		if err != nil {
			return err
		}

		if err := sqlitex.Exec(conn, qBlobsTouch(), nil, newID, res.BlobsID); err != nil {
			return err
		}

		out = cid.NewCidV1(uint64(res.BlobsCodec), res.BlobsMultihash)

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return cid.Undef, fmt.Errorf("BUG: got draft without CID")
	}

	return out, nil
}

// PublishDraft publishes a draft.
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
		if res.DraftsViewBlobID == 0 {
			return fmt.Errorf("no draft to publish for entity %s", eid)
		}

		if err := hypersql.DraftsDelete(conn, res.DraftsViewBlobID); err != nil {
			return err
		}

		newID, err := allocateBlobID(conn)
		if err != nil {
			return err
		}

		if err := sqlitex.Exec(conn, qBlobsTouch(), nil, newID, res.DraftsViewBlobID); err != nil {
			return err
		}

		out = cid.NewCidV1(uint64(res.DraftsViewCodec), res.DraftsViewMultihash)

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return cid.Undef, fmt.Errorf("BUG: got draft without CID")
	}

	return out, nil
}

var qBlobsTouch = dqb.Str(`
	UPDATE blobs
	SET id = :newID
	WHERE id = :oldID;
`)

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
		if res.DraftsViewBlobID == 0 {
			return fmt.Errorf("no draft to publish for entity %s", eid)
		}

		if err := hypersql.DraftsDelete(conn, res.DraftsViewBlobID); err != nil {
			return err
		}

		_, err = hypersql.BlobsDelete(conn, res.DraftsViewMultihash)
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

// DeleteEntity deletes an entity from the database.
func (bs *Storage) DeleteEntity(ctx context.Context, eid EntityID) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		edb, err := hypersql.EntitiesLookupID(conn, string(eid))
		if err != nil {
			return fmt.Errorf("%w. problem with the query: %s", ErrEntityNotFound, err.Error())
		}
		if edb.ResourcesID == 0 {
			return fmt.Errorf("%w: %s", ErrEntityNotFound, eid)
		}

		if err := hypersql.ChangesDeleteForEntity(conn, edb.ResourcesID); err != nil {
			return err
		}

		return hypersql.EntitiesDelete(conn, string(eid))

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

		codec, hash := ipfs.DecodeCID(blob.CID)

		id, exists, err := bs.bs.putBlock(conn, oldid, uint64(codec), hash, blob.Data)
		if err != nil {
			return fmt.Errorf("replace draft blob error when insert: %w", err)
		}

		// No need to index if exists.
		if exists {
			return nil
		}

		if err := bs.indexBlob(conn, id, blob.CID, blob.Decoded); err != nil {
			return fmt.Errorf("failed to index blob %s: %w", blob.CID, err)
		}

		resp, err := hypersql.EntitiesLookupID(conn, string(eid))
		if err != nil {
			return err
		}
		if resp.ResourcesID == 0 {
			panic("BUG: replaceDraft: failed to lookup entity after inserting the blob")
		}

		return hypersql.DraftsInsert(conn, resp.ResourcesID, id)
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

// GetDelegationIssuer returns the issuer of the given key delegation.
func (bs *Storage) GetDelegationIssuer(ctx context.Context, c cid.Cid) (core.Principal, error) {
	if v, ok := bs.delegationCache.Get(c); ok {
		return v, nil
	}

	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	iss, err := hypersql.KeyDelegationsGetIssuer(conn, c.Hash())
	if err != nil {
		return nil, err
	}
	if iss.KeyDelegationsIssuer == 0 {
		return nil, fmt.Errorf("key delegation %s not found", c)
	}

	pk, err := hypersql.PublicKeysLookupPrincipal(conn, iss.KeyDelegationsIssuer)
	if err != nil {
		return nil, err
	}
	if pk.PublicKeysPrincipal == nil {
		return nil, fmt.Errorf("BUG: public key not found for issuer of %s", c)
	}

	bs.delegationCache.Add(c, pk.PublicKeysPrincipal)

	return pk.PublicKeysPrincipal, nil
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
	CID     cid.Cid
	Data    []byte
	Decoded any
}

// EncodeBlob produces a Blob from any object.
func EncodeBlob(v any) (hb Blob, err error) {
	data, err := cbornode.DumpObject(v)
	if err != nil {
		return hb, fmt.Errorf("failed to encode blob %T: %w", v, err)
	}

	blk := ipfs.NewBlock(uint64(multicodec.DagCbor), data)
	c := blk.Cid()

	return Blob{
		CID:     c,
		Data:    data,
		Decoded: v,
	}, nil
}

var errNotHyperBlob = errors.New("not a hyper blob")

// DecodeBlob attempts to infer hyper Blob information from arbitrary IPFS block.
func DecodeBlob(c cid.Cid, data []byte) (hb Blob, err error) {
	codec := c.Prefix().Codec

	switch multicodec.Code(codec) {
	case multicodec.DagPb:
		b := dagpb.Type.PBNode.NewBuilder()
		if err := dagpb.DecodeBytes(b, data); err != nil {
			return hb, fmt.Errorf("failed to decode dagpb node %s: %w", c, err)
		}

		hb.Decoded = b.Build()
	case multicodec.DagCbor:
		var v struct {
			Type string `cbor:"@type"`
		}
		if err := cbor.Unmarshal(data, &v); err != nil {
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
		case TypeComment:
			var v Comment
			if err := cbornode.DecodeInto(data, &v); err != nil {
				return hb, err
			}
			hb.Decoded = v
		default:
			return hb, fmt.Errorf("unknown hyper blob type: '%s'", v.Type)
		}
	default:
		return hb, fmt.Errorf("%s: %w", c, errNotHyperBlob)
	}

	hb.CID = c
	hb.Data = data

	return hb, nil
}

type indexingBlockStore struct {
	*blockStore
	indexBlob func(conn *sqlite.Conn, id int64, c cid.Cid, blob any) error
}

// The following Get methods are wrapped to make sure
// we can respond to BitSwap requests asking for our CID-encoded Entity IDs.

func (b *indexingBlockStore) Get(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	eid, err := EntityIDFromCID(c)
	if err != nil {
		return b.blockStore.Get(ctx, c)
	}

	ok, err := b.checkEntityExists(ctx, eid)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, format.ErrNotFound{Cid: c}
	}

	return blocks.NewBlockWithCid(nil, c)
}

func (b *indexingBlockStore) GetSize(ctx context.Context, c cid.Cid) (int, error) {
	eid, err := EntityIDFromCID(c)
	if err != nil {
		return b.blockStore.GetSize(ctx, c)
	}

	ok, err := b.checkEntityExists(ctx, eid)
	if err != nil {
		return 0, err
	}

	if !ok {
		return 0, format.ErrNotFound{Cid: c}
	}

	return 0, nil
}

func (b *indexingBlockStore) Has(ctx context.Context, c cid.Cid) (bool, error) {
	eid, err := EntityIDFromCID(c)
	if err != nil {
		return b.blockStore.Has(ctx, c)
	}

	ok, err := b.checkEntityExists(ctx, eid)
	if err != nil {
		return false, err
	}

	return ok, nil
}

func (b *indexingBlockStore) checkEntityExists(ctx context.Context, eid EntityID) (exists bool, err error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return false, err
	}
	defer release()

	res, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return false, err
	}

	if res.ResourcesID == 0 {
		return false, nil
	}

	return hypersql.CheckEntityHasChanges(conn, res.ResourcesID)
}

// The following methods are wrapped
// to make sure all the blobs
// coming into the blockstore
// from the outside are indexed.

func (b *indexingBlockStore) Put(ctx context.Context, block blocks.Block) error {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		codec, hash := ipfs.DecodeCID(block.Cid())
		id, exists, err := b.putBlock(conn, 0, codec, hash, block.RawData())
		if err != nil {
			return err
		}

		if exists || !isIndexable(multicodec.Code(codec)) {
			return nil
		}

		hb, err := DecodeBlob(block.Cid(), block.RawData())
		if err != nil {
			return err
		}
		return b.indexBlob(conn, id, hb.CID, hb.Decoded)
	})
}

// PutMany implements blockstore.Blockstore interface.
func (b *indexingBlockStore) PutMany(ctx context.Context, blocks []blocks.Block) error {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		for _, blk := range blocks {
			codec, hash := ipfs.DecodeCID(blk.Cid())
			id, exists, err := b.putBlock(conn, 0, codec, hash, blk.RawData())
			if err != nil {
				return err
			}

			if exists || !isIndexable(multicodec.Code(codec)) {
				continue
			}

			hb, err := DecodeBlob(blk.Cid(), blk.RawData())
			if err != nil {
				return err
			}

			if err := b.indexBlob(conn, id, hb.CID, hb.Decoded); err != nil {
				return err
			}
		}

		return nil
	})
}
