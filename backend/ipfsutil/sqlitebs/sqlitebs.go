// Package sqlitebs implements IPFS Blockstore interface using SQLite.
package sqlitebs

import (
	"context"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
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
}

// Config for table and column names.
type Config struct {
	TableName       string
	ColumnMultihash string
	ColumnCodec     string
	ColumnData      string
}

type queries struct {
	Get       string
	Has       string
	GetSize   string
	Put       string
	Delete    string
	SelectAll string
}

const defaultTimeout = time.Minute

// DefaultConfig creates a default config.
func DefaultConfig() Config {
	return Config{
		TableName:       "ipfs_blocks",
		ColumnMultihash: "multihash",
		ColumnCodec:     "codec",
		ColumnData:      "data",
	}
}

// New creates a new block store from a given connection pool.
// The corresponding table and columns must be created beforehand.
// Use DefaultConfig() for default table and column names.
func New(db *sqlitex.Pool, cfg Config) *Blockstore {
	return &Blockstore{
		Log: zap.NewNop(),

		db:  db,
		cfg: cfg,
		queries: queries{
			Has:       "SELECT 1 FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			Get:       "SELECT " + cfg.ColumnData + " FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			GetSize:   "SELECT LENGTH(" + cfg.ColumnData + ") FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			Put:       "INSERT OR IGNORE INTO " + cfg.TableName + " (" + cfg.ColumnMultihash + ", " + cfg.ColumnCodec + ", " + cfg.ColumnData + ") VALUES (?, ?, ?)",
			Delete:    "DELETE FROM " + cfg.TableName + " WHERE " + cfg.ColumnMultihash + " = ?",
			SelectAll: "SELECT " + cfg.ColumnMultihash + ", " + cfg.ColumnCodec + " FROM " + cfg.TableName,
		},
	}
}

// CreateTables will attempt to create the tables according to the config.
// Users that want the blockstore to create tables should call this before using the blockstore.
func (b *Blockstore) CreateTables(ctx context.Context) error {
	conn, release, err := b.connWithTimeout()
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.ExecScript(conn, `
CREATE TABLE `+b.cfg.TableName+` (
	`+b.cfg.ColumnMultihash+` BLOB PRIMARY KEY,
	`+b.cfg.ColumnCodec+` INTEGER,
	`+b.cfg.ColumnData+` BYTES
) WITHOUT ROWID;
`)
}

// Has implements blockstore.Blockstore interface.
func (b *Blockstore) Has(cid cid.Cid) (bool, error) {
	var out bool

	err := b.exec(b.queries.Has, func(stmt *sqlite.Stmt) error {
		out = true
		return nil
	}, cid.Hash())
	if err != nil {
		return false, err
	}

	return out, nil
}

// Get implements blockstore.Blockstore interface.
func (b *Blockstore) Get(cid cid.Cid) (blocks.Block, error) {
	var data []byte
	err := b.exec(b.queries.Get, func(stmt *sqlite.Stmt) error {
		data = stmt.ColumnBytes(0)
		return nil
	}, cid.Hash())
	if err != nil {
		return nil, err
	}

	if data == nil {
		return nil, blockstore.ErrNotFound
	}

	return blocks.NewBlockWithCid(data, cid)
}

// GetSize implements blockstore.Blockstore interface.
func (b *Blockstore) GetSize(cid cid.Cid) (int, error) {
	var size int
	err := b.exec(b.queries.GetSize, func(stmt *sqlite.Stmt) error {
		size = stmt.ColumnInt(0)
		return nil
	}, cid.Hash())
	if err != nil {
		return 0, err
	}

	if size == 0 {
		return 0, blockstore.ErrNotFound
	}

	return size, nil
}

// Put implements blockstore.Blockstore interface.
func (b *Blockstore) Put(block blocks.Block) error {
	conn, release, err := b.connWithTimeout()
	if err != nil {
		return err
	}
	defer release()

	return b.putBlock(conn, block)
}

// PutMany implements blockstore.Blockstore interface.
func (b *Blockstore) PutMany(blocks []blocks.Block) error {
	conn, release, err := b.connWithTimeout()
	if err != nil {
		return err
	}
	defer release()

	for _, blk := range blocks {
		if err := b.putBlock(conn, blk); err != nil {
			return err
		}
	}

	return nil
}

func (b *Blockstore) putBlock(conn *sqlite.Conn, block blocks.Block) error {
	var (
		cid   = block.Cid()
		codec = block.Cid().Prefix().Codec
		data  = block.RawData()
	)

	err := sqlitex.Exec(conn, b.queries.Put, nil, cid.Hash(), codec, data)
	if err != nil {
		return err
	}

	return nil
}

// DeleteBlock implements blockstore.Blockstore interface.
func (b *Blockstore) DeleteBlock(cid cid.Cid) error {
	return b.exec(b.queries.Delete, nil, cid.Hash())
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

func (b *Blockstore) exec(query string, fn func(*sqlite.Stmt) error, args ...interface{}) error {
	conn, release, err := b.connWithTimeout()
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.Exec(conn, query, fn, args...)
}

func (b *Blockstore) connWithTimeout() (*sqlite.Conn, context.CancelFunc, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	conn, release, err := b.db.Conn(ctx)
	return conn, func() {
		cancel()
		release()
	}, err
}
