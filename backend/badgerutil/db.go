package badgerutil

import (
	"fmt"

	"github.com/dgraph-io/badger/v3"
)

// DB is a wrapper around Badger that can allocate UIDs.
type DB struct {
	*badger.DB
	seq *badger.Sequence
	ns  string
}

// NewDB creates a new DB instance.
func NewDB(b *badger.DB, namespace string) (*DB, error) {
	k, _ := makeKey(namespace, PrefixInternal, KeyTypeData, "last-uid", 0)

	// We want our uid sequence to start from 1, so we do all this crazyness
	// to detect if we need to waist the 0 sequence.
	err := b.View(func(txn *badger.Txn) error {
		_, err := txn.Get(k)
		return err
	})
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to init sequence: %w", err)
	}

	var newSeq bool
	if err == badger.ErrKeyNotFound {
		newSeq = true
	}

	seq, err := b.GetSequence(k, 20)
	if err != nil {
		return nil, err
	}

	if newSeq {
		s, err := seq.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to allocate new sequence: %w", err)
		}
		if s != 0 {
			panic("BUG: something wrong happened during sequence initialization, first seq must be 0")
		}
	}

	return &DB{
		DB:  b,
		seq: seq,
		ns:  namespace,
	}, nil
}

// Close the underlying resources of the database.
// Users must close Badger instance explicitly elsewhere.
func (db *DB) Close() error {
	return db.seq.Release()
}
