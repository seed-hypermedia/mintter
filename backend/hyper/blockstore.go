package hyper

import (
	"context"
	"fmt"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blockstore "github.com/ipfs/boxo/blockstore"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	format "github.com/ipfs/go-ipld-format"
	"github.com/klauspost/compress/zstd"
	"github.com/multiformats/go-multihash"
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
	conn, release, err := b.db.Conn(ctx, "dbg12")
	if err != nil {
		return false, err
	}
	defer release()

	return b.has(conn, c)
}

func (b *blockStore) has(conn *sqlite.Conn, c cid.Cid) (bool, error) {
	res, err := hypersql.BlobsHave(conn, c.Hash())
	if err != nil {
		return false, err
	}

	if res.Have == 1 {
		return true, nil
	}

	return false, nil
}

// Get implements blockstore.Blockstore interface.
func (b *blockStore) Get(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	conn, release, err := b.db.Conn(ctx, "dbg13")
	if err != nil {
		return nil, err
	}
	defer release()

	return b.get(conn, c)
}

func (b *blockStore) get(conn *sqlite.Conn, c cid.Cid) (blocks.Block, error) {
	res, err := hypersql.BlobsGet(conn, c.Hash())
	if err != nil {
		return nil, err
	}

	if res.BlobsID == 0 {
		return nil, format.ErrNotFound{Cid: c}
	}

	// Size 0 means that data is stored inline in the CID.
	if res.BlobsSize == 0 {
		return blocks.NewBlockWithCid(nil, c)
	}

	data, err := b.decompress(res.BlobsData, int(res.BlobsSize))
	if err != nil {
		return nil, err
	}

	return blocks.NewBlockWithCid(data, c)
}

func (b *blockStore) decompress(data []byte, originalSize int) ([]byte, error) {
	var err error
	out := make([]byte, 0, originalSize)
	out, err = b.decoder.DecodeAll(data, out)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress blob: %w", err)
	}
	return out, nil
}

// GetSize implements blockstore.Blockstore interface.
func (b *blockStore) GetSize(ctx context.Context, c cid.Cid) (int, error) {
	conn, release, err := b.db.Conn(ctx, "dbg14")
	if err != nil {
		return 0, err
	}
	defer release()

	res, err := hypersql.BlobsGetSize(conn, c.Hash())
	if err != nil {
		return 0, err
	}

	if res.BlobsID == 0 || res.BlobsSize < 0 {
		return 0, format.ErrNotFound{Cid: c}
	}

	return int(res.BlobsSize), nil
}

// Put implements blockstore.Blockstore interface.
func (b *blockStore) Put(ctx context.Context, block blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.WithTx(conn, func() error {
			codec, hash := ipfs.DecodeCID(block.Cid())
			_, _, err := b.putBlock(conn, 0, codec, hash, block.RawData())
			return err
		})
	})
}

// PutMany implements blockstore.Blockstore interface.
func (b *blockStore) PutMany(ctx context.Context, blocks []blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.WithTx(conn, func() error {
			for _, blk := range blocks {
				codec, hash := ipfs.DecodeCID(blk.Cid())
				if _, _, err := b.putBlock(conn, 0, codec, hash, blk.RawData()); err != nil {
					return err
				}
			}
			return nil
		})
	})
}

func (b *blockStore) putBlock(conn *sqlite.Conn, inID int64, codec uint64, hash multihash.Multihash, data []byte) (id int64, exists bool, err error) {
	size, err := hypersql.BlobsGetSize(conn, hash)
	if err != nil {
		return 0, false, err
	}

	var update bool

	switch {
	// We have this blob already. Size can be 0 if data is inlined in the CID.
	case size.BlobsID != 0 && size.BlobsSize >= 0:
		return size.BlobsID, true, nil
	// We know about the blob, but we don't have it.
	case size.BlobsID != 0 && size.BlobsSize < 0:
		update = true
	// We don't have nor know anything about the blob.
	case size.BlobsID == 0 && size.BlobsSize == 0:
	default:
		panic("BUG: unhandled blob insert case")
	}

	var compressed []byte
	// We store IPFS blocks compressed in the database. But for inline CIDs, there's no data (because it's inline),
	// hence nothing to compress. It could be that compression doesn't actually bring much benefit, we'd have to
	// measure at some point whether or not it's useful. As we're storing a lot of text, I assume storage-wise
	// it should make a difference, but the performance hit needs to be measured.
	//
	// TODO(burdiyan): don't compress if original data is <= compressed data.
	if len(data) > 0 {
		compressed = make([]byte, 0, len(data))
		compressed = b.encoder.EncodeAll(data, compressed)
	}

	if update {
		return size.BlobsID, false, hypersql.BlobsUpdate(conn, compressed, int64(len(data)), size.BlobsID)
	}

	ins, err := hypersql.BlobsInsert(conn, inID, hash, int64(codec), compressed, int64(len(data)))
	return ins.BlobsID, false, err
}

// DeleteBlock implements blockstore.Blockstore interface.
func (b *blockStore) DeleteBlock(ctx context.Context, c cid.Cid) error {
	conn, release, err := b.db.Conn(ctx, "dbg15")
	if err != nil {
		return err
	}
	defer release()

	_, err = b.deleteBlock(conn, c)
	return err
}

func (b *blockStore) deleteBlock(conn *sqlite.Conn, c cid.Cid) (oldid int64, err error) {
	ret, err := hypersql.BlobsDelete(conn, c.Hash())
	return ret.BlobsID, err
}

// AllKeysChan implements. blockstore.Blockstore interface.
func (b *blockStore) AllKeysChan(ctx context.Context) (<-chan cid.Cid, error) {
	c := make(chan cid.Cid, 10) // The buffer is arbitrary.

	conn, release, err := b.db.Conn(ctx, "dbg16")
	if err != nil {
		return nil, err
	}

	list, err := hypersql.BlobsListKnown(conn)
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
			case c <- cid.NewCidV1(uint64(l.BlobsCodec), l.BlobsMultihash):
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
	conn, release, err := b.db.Conn(ctx, "dbg17")
	if err != nil {
		return err
	}
	defer release()

	return fn(conn)
}
