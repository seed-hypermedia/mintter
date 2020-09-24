// Package badgerkv providers a Badger-backed implementation of kv.Txn.
package badgerkv

import (
	"bytes"
	"fmt"
	"io"

	"mintter/backend/kv"

	"github.com/dgraph-io/badger"
)

var (
	entitySequenceKey = []byte{1}
)

// DB holds some kv-specific state in addition to mixing in a badger.DB.
type DB struct {
	*badger.DB
	seq *badger.Sequence
}

// DefaultOptions returns a recommended default Options value for a database
// rooted at dir.
func DefaultOptions(dir string) badger.Options {
	return badger.DefaultOptions(dir)
}

// Open creates a new DB with the given options.
func Open(opt badger.Options) (*DB, error) {
	bdb, err := badger.Open(opt)
	if err != nil {
		return nil, err
	}

	seq, err := bdb.GetSequence(entitySequenceKey, 128)
	if err != nil {
		bdb.Close()
		return nil, err
	}

	return &DB{bdb, seq}, nil
}

// Dump content of the database into w.
func (db *DB) Dump(w io.Writer) {
	txn := db.NewTransaction(false)
	defer txn.Discard()
	opts := badger.DefaultIteratorOptions
	iter := txn.NewIterator(opts)
	defer iter.Close()
	count := 0
	for iter.Seek([]byte{0}); iter.Valid(); iter.Next() {
		item := iter.Item()
		key := item.Key()
		value, err := item.ValueCopy(nil)
		if err != nil {
			fmt.Fprintf(w, "%x\t%v", key, err)
			break
		}
		fmt.Fprintf(w, "%x\t%x\n", key, value)
		count++
	}
	fmt.Fprintf(w, "%v keys\n", count)
}

// Close releases unallocated Entity values and closes the database.
func (db *DB) Close() error {
	if db == nil {
		return nil
	}
	if db.seq != nil {
		if err := db.seq.Release(); err != nil {
			_ = err
		}
	}
	return db.DB.Close()
}

// NewTxn creates a new kv.Txn.
func (db *DB) NewTxn(update bool) kv.TxnCommitDiscarder {
	btxn := db.DB.NewTransaction(update)
	return txn{db: db, tx: btxn}
}

type txn struct {
	db *DB
	tx *badger.Txn
}

func (s txn) Alloc() (kv.Entity, error) {
	u64, err := s.db.seq.Next()
	if u64 == 0 {
		u64, err = s.db.seq.Next()
		if u64 == 0 {
			return 0, fmt.Errorf("Alloc returned zero twice in a row")
		}
	}
	return kv.Entity(u64), err
}

func (s txn) Set(key, value []byte) error { return s.tx.Set(key, value) }

func (s txn) Delete(key []byte) error { return s.tx.Delete(key) }

func (s txn) Get(key []byte, f func([]byte) error) error {
	item, err := s.tx.Get(key)
	if err == badger.ErrKeyNotFound {
		return f(nil)
	} else if err != nil {
		return err
	} else {
		return item.Value(f)
	}
}

func (s txn) PrefixIterator(prefix []byte) kv.Iterator {
	opts := badger.DefaultIteratorOptions
	// Work around https://github.com/dgraph-io/badger/issues/992 by *not*
	// setting opts.Prefix = prefix. We will do our own prefix logic in this
	// module.
	return iterator{
		s.tx.NewIterator(opts),
		prefix,
	}
}

func (s txn) Commit() error {
	return s.tx.Commit()
}

func (s txn) Discard() {
	s.tx.Discard()
}

type iterator struct {
	*badger.Iterator
	prefix []byte
}

func (i iterator) Seek(key []byte) { i.Iterator.Seek(append(i.prefix, key...)) }

func (i iterator) Key() []byte { return i.Item().Key()[len(i.prefix):] }

func (i iterator) Valid() bool {
	return i.Iterator.Valid() && bytes.HasPrefix(i.Item().Key(), i.prefix)
}

func (i iterator) Value(f func([]byte) error) error { return i.Item().Value(f) }

func (i iterator) Discard() { i.Close() }
