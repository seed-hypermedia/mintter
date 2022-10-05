// Package sqliteds is an implementation of IPFS datastore interface on top of SQLite.
package sqliteds

import (
	"context"
	"fmt"
	"sync"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	"github.com/leporo/sqlf"
	"go.uber.org/multierr"
)

const (
	keyCol = "key"
	valCol = "value"
)

// Datastore is a datastore implementation on top of SQLite.
type Datastore struct {
	pool  *sqlitex.Pool
	table string
}

// New creates a new datastore.
func New(pool *sqlitex.Pool, tableName string) *Datastore {
	return &Datastore{pool: pool, table: tableName}
}

// Close is a no-op for SQLite datastore, because it expects the connection pool to be passed.
func (ds *Datastore) Close() error {
	return nil
}

// InitTable ensures the corresponding table for the datastore exists.
func (ds *Datastore) InitTable(ctx context.Context) error {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	q := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (%s TEXT PRIMARY KEY, %s BLOB) WITHOUT ROWID;",
		ds.table,
		keyCol,
		valCol,
	)

	return sqlitex.ExecTransient(conn, q, nil)
}

// Sync is a no-op for SQLite.
func (ds *Datastore) Sync(ctx context.Context, key datastore.Key) error {
	return nil
}

// Get value from the datastore by key.
func (ds *Datastore) Get(ctx context.Context, key datastore.Key) ([]byte, error) {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return ds.get(conn, key)
}

// Put value into the datastore.
func (ds *Datastore) Put(ctx context.Context, key datastore.Key, value []byte) error {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return ds.put(conn, key, value)
}

// GetSize in bytes for the value under a given key.
func (ds *Datastore) GetSize(ctx context.Context, key datastore.Key) (int, error) {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return 0, err
	}
	defer release()

	return ds.getSize(conn, key)
}

// Delete value from the datastore by the given key.
func (ds *Datastore) Delete(ctx context.Context, key datastore.Key) error {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return ds.delete(conn, key)
}

// Has checks if key is in the datastore.
func (ds *Datastore) Has(ctx context.Context, key datastore.Key) (bool, error) {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return false, err
	}
	defer release()

	return ds.has(conn, key)
}

func (ds *Datastore) has(conn *sqlite.Conn, key datastore.Key) (has bool, err error) {
	q := sqlf.From(ds.table).Select("1").Where(keyCol+" = ?", key.String()).Limit(1)
	defer q.Close()

	err = sqlitex.Exec(conn, q.String(), func(stmt *sqlite.Stmt) error {
		has = true
		return nil
	}, q.Args()...)

	return has, err
}

func (ds *Datastore) delete(conn *sqlite.Conn, key datastore.Key) error {
	q := sqlf.DeleteFrom(ds.table).Where(keyCol+" = ?", key.String())
	defer q.Close()
	return sqlitex.Exec(conn, q.String(), nil, q.Args()...)
}

func (ds *Datastore) getSize(conn *sqlite.Conn, key datastore.Key) (out int, err error) {
	q := sqlf.From(ds.table).Select("LENGTH("+valCol+") as size").
		Where(keyCol+"= ?", key.String()).
		Limit(1)
	defer q.Close()

	stmt := conn.Prep(q.String())
	sqlitex.BindArgs(stmt, q.Args()...)
	defer multierr.AppendInvoke(&err, multierr.Invoke(stmt.Reset))

	row, err := stmt.Step()
	if err != nil {
		return 0, err
	}
	if !row {
		return -1, datastore.ErrNotFound
	}

	return stmt.ColumnInt(0), nil
}

// Query the datastore. It's important to call Close() on the returned results,
// to return the database connection to the pool.
func (ds *Datastore) Query(ctx context.Context, q query.Query) (query.Results, error) {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}

	return ds.query(conn, release, q)
}

func (ds *Datastore) get(conn *sqlite.Conn, key datastore.Key) (value []byte, err error) {
	q := sqlf.From(ds.table).
		Select(valCol).
		Where(keyCol+" = ?", key.String()).
		Limit(1)
	defer q.Close()

	var found bool
	err = sqlitex.Exec(conn, q.String(), func(stmt *sqlite.Stmt) error {
		value = stmt.ColumnBytes(0)
		found = true
		return nil
	}, q.Args()...)

	if !found {
		return nil, datastore.ErrNotFound
	}

	return value, err
}

func (ds *Datastore) put(conn *sqlite.Conn, key datastore.Key, value []byte) error {
	q := fmt.Sprintf("INSERT OR REPLACE INTO %s (%s, %s) VALUES (?, ?)", ds.table, keyCol, valCol)
	return sqlitex.Exec(conn, q, nil, key.String(), value)
}

func (ds *Datastore) query(conn *sqlite.Conn, releaseFunc func(), in query.Query) (query.Results, error) {
	raw, err := ds.rawQuery(conn, releaseFunc, in)
	if err != nil {
		return nil, err
	}

	for _, f := range in.Filters {
		raw = query.NaiveFilter(raw, f)
	}

	raw = query.NaiveOrder(raw, in.Orders...)
	raw = query.NaiveOffset(raw, in.Offset)
	raw = query.NaiveLimit(raw, in.Limit)

	return raw, nil
}

func (ds *Datastore) rawQuery(conn *sqlite.Conn, releaseFunc func(), in query.Query) (query.Results, error) {
	q := sqlf.From(ds.table).Select(keyCol)
	defer q.Close()

	if in.Prefix != "" {
		// normalize
		prefix := datastore.NewKey(in.Prefix).String()
		if prefix != "/" {
			q.Where(keyCol+" GLOB ?", prefix+"/*")
		}
	}

	if !in.KeysOnly {
		q.Select(valCol)
	}

	noSizes := in.KeysOnly && !in.ReturnsSizes
	if !noSizes {
		q.Select("LENGTH(" + valCol + ") AS size")
	}

	if in.ReturnExpirations {
		panic("SQLite datastore doesn't support TTL")
	}

	stmt := conn.Prep(q.String())
	sqlitex.BindArgs(stmt, q.Args()...)

	it := iterator(stmt, releaseFunc)

	return query.ResultsFromIterator(in, it), nil
}

func iterator(stmt *sqlite.Stmt, releaseFunc func()) query.Iterator {
	var once sync.Once
	var err error
	closeStmt := func() error {
		once.Do(func() {
			err = stmt.Reset()
			releaseFunc()
		})
		return err
	}

	return query.Iterator{
		Next: func() (query.Result, bool) {
			ok, err := stmt.Step()
			if err != nil {
				return query.Result{Error: err}, false
			}
			if !ok {
				err := closeStmt()
				return query.Result{Error: err}, false
			}

			keyIdx := stmt.ColumnIndex(keyCol)
			valIdx := stmt.ColumnIndex(valCol)
			sizeIdx := stmt.ColumnIndex("size")

			entry := query.Entry{Key: stmt.ColumnText(keyIdx)}

			if valIdx >= 0 {
				entry.Value = stmt.ColumnBytes(valIdx)
			}

			if sizeIdx >= 0 {
				entry.Size = stmt.ColumnInt(sizeIdx)
			}

			return query.Result{Entry: entry}, true
		},
		Close: func() error {
			return closeStmt()
		},
	}
}
