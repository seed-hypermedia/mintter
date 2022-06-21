package vcs

import (
	"context"
	"fmt"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	format "github.com/ipfs/go-ipld-format"
	"github.com/klauspost/compress/zstd"
	"go.uber.org/zap"
)

var _ blockstore.Blockstore = (*blkStore)(nil)

// blkStore is an implementation of IPFS Blockstore.
type blkStore struct {
	// Log is set to no-op by default. Replace it if you want to see logs.
	// Log is only used in the AllKeysChan method, because there's no way to bubble up
	// the errors to the caller otherwise.
	Log *zap.Logger

	db      *sqlitex.Pool
	encoder *zstd.Encoder
	decoder *zstd.Decoder
}

// newBlockstore creates a new block store from a given connection pool.
// The corresponding table and columns must be created beforehand.
// Use DefaultConfig() for default table and column names.
func newBlockstore(db *sqlitex.Pool) *blkStore {
	enc, err := zstd.NewWriter(nil)
	if err != nil {
		panic(err)
	}

	dec, err := zstd.NewReader(nil)
	if err != nil {
		panic(err)
	}

	return &blkStore{
		Log: zap.NewNop(),

		db:      db,
		encoder: enc,
		decoder: dec,
	}
}

// Has implements blockstore.Blockstore interface.
func (b *blkStore) Has(ctx context.Context, c cid.Cid) (bool, error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return false, err
	}
	defer release()

	return b.has(conn, c)
}

func (b *blkStore) has(conn *sqlite.Conn, c cid.Cid) (bool, error) {
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
func (b *blkStore) Get(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return b.get(conn, c)
}

func (b *blkStore) get(conn *sqlite.Conn, c cid.Cid) (blocks.Block, error) {
	res, err := vcssql.IPFSBlocksGet(conn, c.Hash())
	if err != nil {
		return nil, err
	}

	if res.IPFSBlocksID == 0 {
		return nil, format.ErrNotFound{Cid: c}
	}

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
func (b *blkStore) GetSize(ctx context.Context, c cid.Cid) (int, error) {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return 0, err
	}
	defer release()

	return b.getSize(conn, c)
}

func (b *blkStore) getSize(conn *sqlite.Conn, c cid.Cid) (int, error) {
	res, err := vcssql.IPFSBlocksGetSize(conn, c.Hash())
	if err != nil {
		return 0, err
	}

	if res.IPFSBlocksID == 0 {
		return 0, format.ErrNotFound{Cid: c}
	}

	return res.IPFSBlocksSize, nil
}

// Put implements blockstore.Blockstore interface.
func (b *blkStore) Put(ctx context.Context, block blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return b.putBlock(conn, block)
	})
}

// PutMany implements blockstore.Blockstore interface.
func (b *blkStore) PutMany(ctx context.Context, blocks []blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		for _, blk := range blocks {
			if err := b.putBlock(conn, blk); err != nil {
				return err
			}
		}
		return nil
	})
}

func (b *blkStore) putBlock(conn *sqlite.Conn, block blocks.Block) error {
	var (
		cid   = block.Cid()
		codec = block.Cid().Prefix().Codec
		data  = block.RawData()
	)

	out := make([]byte, 0, len(data))
	out = b.encoder.EncodeAll(data, out)

	_, err := vcssql.IPFSBlocksUpsert(conn, cid.Hash(), int(codec), out, len(data), 0)
	return err
}

// DeleteBlock implements blockstore.Blockstore interface.
func (b *blkStore) DeleteBlock(ctx context.Context, c cid.Cid) error {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return b.deleteBlock(conn, c)
}

func (b *blkStore) deleteBlock(conn *sqlite.Conn, c cid.Cid) error {
	return vcssql.IPFSBlocksDelete(conn, c.Hash())
}

// AllKeysChan implements. blockstore.Blockstore interface.
func (b *blkStore) AllKeysChan(ctx context.Context) (<-chan cid.Cid, error) {
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
func (b *blkStore) HashOnRead(bool) {
	panic("hash on read is not implemented for sqlite blockstore")
}

func (b *blkStore) exec(ctx context.Context, query string, fn func(*sqlite.Stmt) error, args ...interface{}) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.Exec(conn, query, fn, args...)
	})
}

func (b *blkStore) withConn(ctx context.Context, fn func(*sqlite.Conn) error) error {
	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return fn(conn)
}
