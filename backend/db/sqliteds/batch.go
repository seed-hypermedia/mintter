package sqliteds

import (
	"context"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-datastore"
)

type batch struct {
	ds  *Datastore
	ops []op
}

type op struct {
	delete bool
	key    datastore.Key
	value  []byte
}

// Batch starts a new batch of operation that must be committed by the caller.
func (ds *Datastore) Batch(ctx context.Context) (datastore.Batch, error) {
	return &batch{ds: ds}, nil
}

func (b *batch) Put(ctx context.Context, key datastore.Key, value []byte) error {
	b.ops = append(b.ops, op{key: key, value: value})
	return nil
}

func (b *batch) Delete(ctx context.Context, key datastore.Key) error {
	b.ops = append(b.ops, op{key: key, delete: true})
	return nil
}

func (b *batch) Commit(ctx context.Context) error {
	conn, release, err := b.ds.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
		for _, op := range b.ops {
			switch op.delete {
			case true:
				if err := b.ds.delete(conn, op.key); err != nil {
					return err
				}
			default:
				if err := b.ds.put(conn, op.key, op.value); err != nil {
					return err
				}
			}
		}

		return nil
	})
}
