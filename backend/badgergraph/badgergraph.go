// Package badgergraph wraps BadgerDB and exposes methods for managing graph data.
// The API is very procedural and low-level. The internals are somewhat inspired
// by Dgraph, Cayley, and Datomic. Not supposed to be a general-purpose database.
package badgergraph

import (
	"fmt"

	"github.com/dgraph-io/badger/v3"
	"go.uber.org/multierr"
)

// DB is a wrapper around Badger that can allocate UIDs.
type DB struct {
	Badger      *badger.DB
	schema      SchemaRegistry
	uids        *badger.Sequence
	cardinality *badger.Sequence
	ns          string
}

// NewDB creates a new DB instance.
func NewDB(b *badger.DB, namespace string, schema SchemaRegistry) (*DB, error) {
	uidsKey, _ := makeKey(namespace, PrefixInternal, KeyTypeData, "last-uid", 0)

	// We want our uid sequence to start from 1, so we do all this crazyness
	// to detect if we need to waist the 0 sequence.
	err := b.View(func(txn *badger.Txn) error {
		_, err := txn.Get(uidsKey)
		return err
	})
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to init sequence: %w", err)
	}

	var newSeq bool
	if err == badger.ErrKeyNotFound {
		newSeq = true
	}

	uids, err := b.GetSequence(uidsKey, 20)
	if err != nil {
		return nil, err
	}

	if newSeq {
		s, err := uids.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to allocate new sequence: %w", err)
		}
		if s != 0 {
			panic("BUG: something wrong happened during sequence initialization, first seq must be 0")
		}
	}

	ck, _ := makeKey(namespace, PrefixInternal, KeyTypeData, "cardinality", 0)
	cardinality, err := b.GetSequence(ck, 500) // We can afford larger bandwidth here.
	if err != nil {
		return nil, fmt.Errorf("failed to get cardinality sequence: %w", err)
	}

	return &DB{
		Badger:      b,
		schema:      schema,
		uids:        uids,
		ns:          namespace,
		cardinality: cardinality,
	}, nil
}

// Close the underlying resources of the database.
// Users must close Badger instance explicitly elsewhere.
func (db *DB) Close() error {
	return multierr.Combine(
		db.uids.Release(),
		db.cardinality.Release(),
	)
}
