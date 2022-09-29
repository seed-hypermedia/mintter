package sqliteds

import (
	"context"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
)

type tx struct {
	ds      *Datastore
	conn    *sqlite.Conn
	release func()
}

// NewTransaction creates a new transaction. It must be committed or discarded to release the connection.
func (ds *Datastore) NewTransaction(ctx context.Context, readOnly bool) (datastore.Txn, error) {
	conn, release, err := ds.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}

	var q string
	if readOnly {
		q = "BEGIN TRANSACTION"
	} else {
		q = "BEGIN IMMEDIATE TRANSACTION"
	}

	err = sqlitex.Exec(conn, q, nil)
	if err != nil {
		release()
		return nil, err
	}

	return &tx{
		ds:      ds,
		conn:    conn,
		release: release,
	}, nil
}

func (tx *tx) Get(ctx context.Context, key datastore.Key) ([]byte, error) {
	return tx.ds.get(tx.conn, key)
}

func (tx *tx) Put(ctx context.Context, key datastore.Key, value []byte) error {
	return tx.ds.put(tx.conn, key, value)
}

func (tx *tx) Delete(ctx context.Context, key datastore.Key) error {
	return tx.ds.delete(tx.conn, key)
}

func (tx *tx) Has(ctx context.Context, key datastore.Key) (bool, error) {
	return tx.ds.has(tx.conn, key)
}

func (tx *tx) Query(ctx context.Context, q query.Query) (query.Results, error) {
	// not passing the release function here, because we might want to continue
	// using the connection and transaction for some other things.
	// Connection is released when transaction is committed or discarded.
	return tx.ds.query(tx.conn, func() {}, q)
}

func (tx *tx) GetSize(ctx context.Context, key datastore.Key) (int, error) {
	return tx.ds.getSize(tx.conn, key)
}

func (tx *tx) Commit(ctx context.Context) error {
	err := sqlitex.Exec(tx.conn, "COMMIT", nil)
	tx.release()
	return err
}

func (tx *tx) Discard(ctx context.Context) {
	err := sqlitex.Exec(tx.conn, "ROLLBACK", nil)
	tx.release()
	_ = err // discard is best-effort, error is not important.
}
