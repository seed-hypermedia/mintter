// Package sqlitebs implements IPFS Blockstore interface using SQLite.
package sqlitebs

import (
	"context"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	format "github.com/ipfs/go-ipld-format"
	"github.com/klauspost/compress/zstd"
	"go.uber.org/zap"
)

var _ blockstore.Blockstore = (*Blockstore)(nil)

// Blockstore is an implementation of IPFS Blockstore.
type Blockstore struct {
	// Log is set to no-op by default. Replace it if you want to see logs.
	// Log is only used in the AllKeysChan method, because there's no way to bubble up
	// the errors to the caller otherwise.
	Log *zap.Logger

	db      *sqlitex.Pool
	cfg     Config
	queries queries

	encoder *zstd.Encoder
	decoder *zstd.Decoder
}

// Config for table and column names.
type Config struct {
	TableName       string
	ColumnMultihash string
	ColumnCodec     string
	ColumnData      string
	ColumnSize      string
}

type queries struct {
	Get       string
	Has       string
	GetSize   string
	Put       string
	Delete    string
	SelectAll string
}

// DefaultConfig creates a default config.
func DefaultConfig() Config {
	return Config{
		TableName:       "ipfs_blocks",
		ColumnMultihash: "multihash",
		ColumnCodec:     "codec",
		ColumnData:      "data",
		ColumnSize:      "size",
	}
}

// New creates a new block store from a given connection pool.
// The corresponding table and columns must be created beforehand.
// Use DefaultConfig() for default table and column names.
func New(db *sqlitex.Pool, cfg Config) *Blockstore {
	enc, err := zstd.NewWriter(nil)
	if err != nil {
		panic(err)
	}

	dec, err := zstd.NewReader(nil)
	if err != nil {
		panic(err)
	}

	return &Blockstore{
		Log: zap.NewNop(),

		db:  db,
		cfg: cfg,
		queries: queries{
			Has:       "SELECT 1 FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			Get:       "SELECT " + cfg.ColumnData + ", " + cfg.ColumnSize + " FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			GetSize:   "SELECT " + cfg.ColumnSize + " FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			Put:       "INSERT OR IGNORE INTO " + cfg.TableName + " (" + cfg.ColumnMultihash + ", " + cfg.ColumnCodec + ", " + cfg.ColumnData + ", " + cfg.ColumnSize + ") VALUES (?, ?, ?, ?)",
			Delete:    "DELETE FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			SelectAll: "SELECT " + cfg.ColumnMultihash + ", " + cfg.ColumnCodec + " FROM " + cfg.TableName,
		},
		encoder: enc,
		decoder: dec,
	}
}

// CreateTables will attempt to create the tables according to the config.
// Users that want the blockstore to create tables should call this before using the blockstore.
func (b *Blockstore) CreateTables(ctx context.Context) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, `
CREATE TABLE `+b.cfg.TableName+` (
	`+b.cfg.ColumnMultihash+` BLOB PRIMARY KEY,
	`+b.cfg.ColumnCodec+` INTEGER,
	`+b.cfg.ColumnData+` BYTES,
	`+b.cfg.ColumnSize+` INTEGER
) WITHOUT ROWID;
`)
	})

}

// Has implements blockstore.Blockstore interface.
func (b *Blockstore) Has(ctx context.Context, cid cid.Cid) (bool, error) {
	var out bool

	err := b.exec(ctx, b.queries.Has, func(stmt *sqlite.Stmt) error {
		out = true
		return nil
	}, cid.Hash())
	if err != nil {
		return false, err
	}

	return out, nil
}

// Get implements blockstore.Blockstore interface.
func (b *Blockstore) Get(ctx context.Context, cid cid.Cid) (blocks.Block, error) {
	var data []byte
	var found int
	err := b.exec(ctx, b.queries.Get, func(stmt *sqlite.Stmt) (err error) {
		found++
		size := stmt.ColumnInt(1)
		data = make([]byte, 0, size)
		compressed := stmt.ColumnBytesUnsafe(0)
		data, err = b.decoder.DecodeAll(compressed, data)
		if err != nil {
			return err
		}

		return nil
	}, cid.Hash())
	if err != nil {
		return nil, err
	}

	if found == 0 {
		return nil, format.ErrNotFound{Cid: cid}
	}

	if len(data) == 0 && data != nil {
		data = nil
	}

	return blocks.NewBlockWithCid(data, cid)
}

// GetSize implements blockstore.Blockstore interface.
func (b *Blockstore) GetSize(ctx context.Context, cid cid.Cid) (int, error) {
	var size int
	err := b.exec(ctx, b.queries.GetSize, func(stmt *sqlite.Stmt) error {
		size = stmt.ColumnInt(0)
		return nil
	}, cid.Hash())
	if err != nil {
		return 0, err
	}

	if size == 0 {
		return 0, format.ErrNotFound{Cid: cid}
	}

	return size, nil
}

// Put implements blockstore.Blockstore interface.
func (b *Blockstore) Put(ctx context.Context, block blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return b.putBlock(conn, block)
	})
}

// PutMany implements blockstore.Blockstore interface.
func (b *Blockstore) PutMany(ctx context.Context, blocks []blocks.Block) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		for _, blk := range blocks {
			if err := b.putBlock(conn, blk); err != nil {
				return err
			}
		}
		return nil
	})
}

func (b *Blockstore) putBlock(conn *sqlite.Conn, block blocks.Block) error {
	var (
		cid   = block.Cid()
		codec = block.Cid().Prefix().Codec
		data  = block.RawData()
	)

	out := make([]byte, 0, len(data))
	out = b.encoder.EncodeAll(data, out)

	err := sqlitex.Exec(conn, b.queries.Put, nil, cid.Hash(), codec, out, len(data))
	if err != nil {
		return err
	}

	return nil
}

// DeleteBlock implements blockstore.Blockstore interface.
func (b *Blockstore) DeleteBlock(ctx context.Context, cid cid.Cid) error {
	return b.exec(ctx, b.queries.Delete, nil, cid.Hash())
}

// AllKeysChan returns a channel with all the keys stored. Failing to drain the channel
// would block the database connection. It should not block any writes, because it's a read-only query,
// but still it's not polite to borrow the connection for too long form the pool :)
// Since the interface is strict with what type is flowing on the channel, we can't properly bubble up
// the errors that could happen during the iteration, so they are logged.
func (b *Blockstore) AllKeysChan(ctx context.Context) (<-chan cid.Cid, error) {
	c := make(chan cid.Cid, 10) // The buffer is arbitrary.

	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	go func() {
		err := sqlitex.Exec(conn, b.queries.SelectAll, func(stmt *sqlite.Stmt) error {
			mh := stmt.ColumnBytes(0)
			codec := stmt.ColumnInt(1)
			c <- cid.NewCidV1(uint64(codec), mh)
			return nil
		})
		if err != nil {
			b.Log.Error("AllKeysChanError", zap.Error(err))
		}

		release()
		close(c)
	}()

	return c, nil
}

// HashOnRead implements blockstore.Blockstore interface, but is not actually implemented.
func (b *Blockstore) HashOnRead(bool) {
	panic("hash on read is not implemented for sqlite blockstore")
}

func (b *Blockstore) exec(ctx context.Context, query string, fn func(*sqlite.Stmt) error, args ...interface{}) error {
	return b.withConn(ctx, func(conn *sqlite.Conn) error {
		return sqlitex.Exec(conn, query, fn, args...)
	})
}

func (b *Blockstore) withConn(ctx context.Context, fn func(*sqlite.Conn) error) error {
	conn, ok := ConnFromContext(ctx)
	if ok {
		return fn(conn)
	}

	conn, release, err := b.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return fn(conn)
}
