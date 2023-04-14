package sqlitevcs

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blockstore "github.com/ipfs/boxo/blockstore"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	format "github.com/ipfs/go-ipld-format"
	"github.com/ipld/go-ipld-prime"
	"github.com/ipld/go-ipld-prime/datamodel"
	cidlink "github.com/ipld/go-ipld-prime/linking/cid"
	codecregistry "github.com/ipld/go-ipld-prime/multicodec"
	"github.com/ipld/go-ipld-prime/traversal"
	"github.com/klauspost/compress/zstd"
	"github.com/multiformats/go-multicodec"
)

var _ blockstore.Blockstore = (*blockStore)(nil)

// blockStore is an implementation of IPFS Blockstore.
type blockStore struct {
	db      *sqlitex.Pool
	encoder *zstd.Encoder
	decoder *zstd.Decoder
}

// newBlockstore creates a new block store from a given connection pool.
// The corresponding table and columns must be created beforehand.
// Use DefaultConfig() for default table and column names.
func newBlockstore(db *sqlitex.Pool) *blockStore {
	enc, err := zstd.NewWriter(nil)
	if err != nil {
		panic(err)
	}

	dec, err := zstd.NewReader(nil)
	if err != nil {
		panic(err)
	}

	return &blockStore{
		db:      db,
		encoder: enc,
		decoder: dec,
	}
}

// Has implements blockstore.Blockstore interface.
func (b *blockStore) Has(ctx context.Context, c cid.Cid) (bool, error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return false, err
	}
	defer release()

	return b.has(conn, c)
}

func (b *blockStore) has(conn *sqlite.Conn, c cid.Cid) (bool, error) {
	res, err := vcssql.IPFSBlocksHas(conn, c.Hash())
	if err != nil {
		return false, err
	}

	if res.Has == 1 {
		return true, nil
	}

	return false, nil
}

// Get implements blockstore.Blockstore interface.
func (b *blockStore) Get(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return b.get(conn, c)
}

func (b *blockStore) get(conn *sqlite.Conn, c cid.Cid) (blocks.Block, error) {
	res, err := vcssql.IPFSBlocksGet(conn, c.Hash())
	if err != nil {
		return nil, err
	}

	if res.IPFSBlocksID == 0 {
		return nil, format.ErrNotFound{Cid: c}
	}

	// Size 0 means that data is stored inline in the CID.
	if res.IPFSBlocksSize == 0 {
		return blocks.NewBlockWithCid(nil, c)
	}

	data := make([]byte, 0, res.IPFSBlocksSize)
	data, err = b.decoder.DecodeAll(res.IPFSBlocksData, data)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress IPFS block: %w", err)
	}

	return blocks.NewBlockWithCid(data, c)
}

// GetSize implements blockstore.Blockstore interface.
func (b *blockStore) GetSize(ctx context.Context, c cid.Cid) (int, error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return 0, err
	}
	defer release()

	return b.getSize(conn, c)
}

func (b *blockStore) getSize(conn *sqlite.Conn, c cid.Cid) (int, error) {
	res, err := vcssql.IPFSBlocksGetSize(conn, c.Hash())
	if err != nil {
		return 0, err
	}

	if res.IPFSBlocksID == 0 {
		return 0, format.ErrNotFound{Cid: c}
	}

	return int(res.IPFSBlocksSize), nil
}

// Put implements blockstore.Blockstore interface.
func (b *blockStore) Put(ctx context.Context, block blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
			return b.putBlock(conn, block.Cid(), block.RawData())
		})
	})
}

// PutMany implements blockstore.Blockstore interface.
func (b *blockStore) PutMany(ctx context.Context, blocks []blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
			for _, blk := range blocks {
				if err := b.putBlock(conn, blk.Cid(), blk.RawData()); err != nil {
					return err
				}
			}
			return nil
		})
	})
}

func (b *blockStore) putBlockWithID(conn *sqlite.Conn, id LocalID, c cid.Cid, data []byte) error {
	var out []byte
	// We store IPFS blocks compressed in the database. But for inline CIDs, there's no data (because it's inline),
	// hence nothing to compress. It could be that compression doesn't actually bring much benefit, we'd have to
	// measure at some point whether or not it's useful. As we're storing a lot of text, I assume storage-wise
	// it should make a difference, but the performance hit needs to be measured.
	//
	// TODO(burdiyan): don't compress if original data is <= compressed data.
	if len(data) > 0 {
		out = make([]byte, 0, len(data))
		out = b.encoder.EncodeAll(data, out)
	}

	// In case we're inserting a block without previously allocated LocalID, we can just upsert it,
	// and let SQLite to generate the sequence ID automatically.
	if id == 0 {
		// It could be that we already know the hash, but didn't have the data before.
		res, err := vcssql.IPFSBlocksUpsert(conn, c.Hash(), int64(c.Prefix().Codec), out, int64(len(data)))
		if err != nil {
			return err
		}

		// If upsert didn't return a new ID, it means that we already had block with this hash.
		// meaning that it was already indexed and everything. So we can just return here.
		if res.IPFSBlocksID == 0 {
			return nil
		}

		return b.indexBlock(conn, LocalID(res.IPFSBlocksID), c, data)
	}

	err := vcssql.IPFSBlocksInsert(conn, int64(id), c.Hash(), int64(c.Prefix().Codec), out, int64(len(data)))
	if err == nil {
		return b.indexBlock(conn, id, c, data)
	}

	var insErr sqlite.Error
	errors.As(err, &insErr)

	if insErr.Code != sqlite.SQLITE_CONSTRAINT_UNIQUE {
		// Unknown error. Return it to the caller.
		return err
	}

	// It could be that we already know the hash, but didn't have the data before.
	res, err := vcssql.IPFSBlocksUpsert(conn, c.Hash(), int64(c.Prefix().Codec), out, int64(len(data)))
	if err != nil {
		return err
	}

	return b.indexBlock(conn, LocalID(res.IPFSBlocksID), c, data)
}

var noIndexCodecs = map[uint64]struct{}{
	uint64(multicodec.Raw):       {},
	uint64(multicodec.Libp2pKey): {},
	core.CodecAccountKey:         {},
}

func (b *blockStore) indexBlock(conn *sqlite.Conn, id LocalID, c cid.Cid, data []byte) error {
	codec := c.Type()
	if _, ok := noIndexCodecs[codec]; ok {
		return nil
	}

	dec, err := codecregistry.LookupDecoder(codec)
	if err != nil {
		return fmt.Errorf("failed to index IPLD node: %w", err)
	}

	node, err := ipld.Decode(data, dec)
	if err != nil {
		return fmt.Errorf("failed to index IPLD node: parse error: %w", err)
	}

	if err := traversal.WalkLocal(node, func(p traversal.Progress, n datamodel.Node) error {
		link, err := n.AsLink()
		if err != nil {
			// We ignore the error here because we want to continue walking if this field is not a link.
			return nil
		}

		cl, ok := link.(cidlink.Link)
		if !ok {
			return fmt.Errorf("UNEXPECTED BEHAVIOR: found an IPLD link which is not CID: %v", n)
		}

		// We don't want to store dependencies on CIDs we don't care about.
		if _, ok := noIndexCodecs[cl.Cid.Type()]; ok {
			return nil
		}

		parent, err := ensureIPFSBlock(conn, cl.Cid)
		if err != nil {
			return err
		}

		if err := vcssql.IPLDLinksInsertOrIgnore(conn, int64(id), parent, p.Path.String()); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return err
	}

	return nil
}

func (b *blockStore) putBlock(conn *sqlite.Conn, c cid.Cid, data []byte) error {
	return b.putBlockWithID(conn, 0, c, data)
}

// DeleteBlock implements blockstore.Blockstore interface.
func (b *blockStore) DeleteBlock(ctx context.Context, c cid.Cid) error {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	_, err = b.deleteBlock(conn, c)
	return err
}

func (b *blockStore) deleteBlock(conn *sqlite.Conn, c cid.Cid) (oldid int64, err error) {
	ret, err := vcssql.IPFSBlocksDelete(conn, c.Hash())
	return ret.IPFSBlocksID, err
}

// AllKeysChan implements. blockstore.Blockstore interface.
func (b *blockStore) AllKeysChan(ctx context.Context) (<-chan cid.Cid, error) {
	c := make(chan cid.Cid, 10) // The buffer is arbitrary.

	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	list, err := vcssql.IPFSBlocksListValid(conn)
	if err != nil {
		return nil, err
	}

	release()

	go func() {
		defer close(c)

		for _, l := range list {
			select {
			case <-ctx.Done():
				return
			case c <- cid.NewCidV1(uint64(l.IPFSBlocksCodec), l.IPFSBlocksMultihash):
				// Written successfully.
			}
		}
	}()

	return c, nil
}

// HashOnRead satisfies blockstore.Blockstore interface, but is not actually implemented.
func (b *blockStore) HashOnRead(bool) {
	panic("hash on read is not implemented for sqlite blockstore")
}

func (b *blockStore) withConn(ctx context.Context, fn func(*sqlite.Conn) error) error {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return fn(conn)
}

func ensureIPFSBlock(conn *sqlite.Conn, c cid.Cid) (int64, error) {
	codec, hash := ipfs.DecodeCID(c)
	res, err := vcssql.IPFSBlocksLookupPK(conn, hash)
	if err != nil {
		return 0, err
	}

	if res.IPFSBlocksID != 0 {
		return res.IPFSBlocksID, nil
	}

	upsert, err := vcssql.IPFSBlocksUpsert(conn, hash, int64(codec), nil, -1)
	if err != nil {
		return 0, err
	}

	if upsert.IPFSBlocksID == 0 {
		panic("BUG: didn't insert pending IPFS block")
	}

	return upsert.IPFSBlocksID, nil
}
