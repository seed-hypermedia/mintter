package badgerutil

import (
	"fmt"

	"github.com/dgraph-io/badger/v3"
)

// DB is a wrapper around Badger that can allocate UIDs.
type DB struct {
	*badger.DB
	seq *badger.Sequence
	ns  []byte
}

// NewDB creates a new DB instance.
func NewDB(b *badger.DB, namespace []byte) (*DB, error) {
	k, _ := makeKeyBuf(namespace, PrefixInternal, KeyTypeData, lastUIDPred, 0)

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

// UIDReadOnly tries to read the uid for a given kind with given id. Fails if not found.
func (db *DB) UIDReadOnly(txn *badger.Txn, kind, xid []byte) (uint64, error) {
	k := uidKey(db.ns, kind, xid)
	return GetUint64(txn, k)
}

// UID reads or creates a new uid for something of a given kind with the given id.
func (db *DB) UID(txn *badger.Txn, kind, xid []byte) (uint64, error) {
	k := uidKey(db.ns, kind, xid)

	uid, err := GetUint64(txn, k)
	if err == nil {
		return uid, nil
	}

	if err != badger.ErrKeyNotFound {
		return 0, err
	}

	uid, err = db.seq.Next()
	if err != nil {
		return 0, err
	}

	if err := SetUint64(txn, k, uid); err != nil {
		return 0, fmt.Errorf("failed to store allocated uid: %w", err)
	}

	return uid, nil
}

// SetData sets the value for the predicate.
func (db *DB) SetData(txn *badger.Txn, predicate []byte, uid uint64, v []byte) error {
	k := dataKey(db.ns, predicate, uid)
	return txn.Set(k, v)
}

// GetData gets the value for the predicate. Make sure to copy the returned value
// bytes if you need to use it outside the transaction.
func (db *DB) GetData(txn *badger.Txn, predicate []byte, uid uint64, codec func([]byte) error) error {
	k := dataKey(db.ns, predicate, uid)
	item, err := txn.Get(k)
	if err != nil {
		return err
	}

	return item.Value(codec)
}

// ScanData creates a new iterator for a given predicate data.
func (db *DB) ScanData(txn *badger.Txn, predicate []byte, opts ...ScanOption) *badger.Iterator {
	itopts := badger.DefaultIteratorOptions
	for _, o := range opts {
		o(&itopts)
	}
	itopts.Prefix = dataPrefix(db.ns, predicate)

	return txn.NewIterator(itopts)
}

// Close the underlying resources of the database.
// Users must close Badger instance explicitly elsewhere.
func (db *DB) Close() error {
	return db.seq.Release()
}

// ScanOptions is a functional option type for badger iterator.
type ScanOption func(*badger.IteratorOptions)

// WithScanPrefetchValues sets prefetch values option for badger iterator.
func WithScanPrefetchValues(v bool) ScanOption {
	return func(opts *badger.IteratorOptions) {
		opts.PrefetchValues = v
	}
}

// WithScanPrefetchSize sets prefetch values option for badger iterator.
func WithScanPrefetchSize(v int) ScanOption {
	return func(opts *badger.IteratorOptions) {
		opts.PrefetchSize = v
	}
}
