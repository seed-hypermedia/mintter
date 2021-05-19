package badgergraph

import (
	"fmt"
	"math"

	"github.com/dgraph-io/badger/v3"
)

// NewTransaction starts a new transaction.
func (db *DB) NewTransaction(update bool) *Txn {
	return &Txn{
		Txn:      db.Badger.NewTransaction(update),
		canWrite: update,
		db:       db,
	}
}

// Update wraps read-write transaction handling.
func (db *DB) Update(fn func(txn *Txn) error) error {
	txn := db.NewTransaction(true)
	defer txn.Discard()

	if err := fn(txn); err != nil {
		return err
	}

	return txn.Commit()
}

// View wraps read-only transaction handling.
func (db *DB) View(fn func(txn *Txn) error) error {
	txn := db.NewTransaction(false)
	defer txn.Discard()

	return fn(txn)
}

// Txn is a wrapper around Badger's transaction that exposes
// our graph store methods.
type Txn struct {
	*badger.Txn
	db       *DB
	canWrite bool
}

// XID returns external ID of a give UID. You have to know node type in advance.
func (txn *Txn) XID(nodeType string, uid uint64) ([]byte, error) {
	v, err := txn.GetProperty(uid, nodeType+".$xid")
	if err != nil {
		return nil, err
	}

	return v.([]byte), nil
}

// UID returns a UID for a given node type with a given external id.
// New UIDs can only be allocated in the write mode, so this call will fail
// in read-only transaction when there's no UID allocated already for this node.
func (txn *Txn) UID(nodeType string, xid []byte) (uint64, error) {
	uid, err := txn.UIDRead(nodeType, xid)
	if err == nil {
		return uid, nil
	}

	if err != badger.ErrKeyNotFound {
		return 0, err
	}

	if !txn.canWrite {
		return 0, err
	}

	return txn.UIDAllocate(nodeType, xid)
}

// UIDRead reads a previously allocated UID.
func (txn *Txn) UIDRead(nodeType string, xid []byte) (uint64, error) {
	xidPredicate := nodeType + ".$xid"
	if xid == nil {
		panic("BUG: can't allocate uids for nodes without external ids yet")
	}

	return txn.GetIndexUnique(xidPredicate, xid)
}

// UIDAllocate allocates a new uid for node type.
func (txn *Txn) UIDAllocate(nodeType string, xid []byte) (uint64, error) {
	if xid == nil {
		panic("BUG: can't allocate uids for nodes without external ids yet")
	}

	if !txn.canWrite {
		return 0, fmt.Errorf("can't allocate uid in read-only transaction")
	}

	uid, err := txn.db.uids.Next()
	if err != nil {
		return 0, err
	}

	if err := txn.WriteTriple(uid, txn.db.schema.schema[nodeType][xidPredicate], xid); err != nil {
		return 0, err
	}

	if err := txn.WriteTriple(uid, txn.db.schema.schema[nodeType][nodeTypePredicate], nodeType); err != nil {
		return 0, err
	}

	return uid, err
}

// GetProperty reads a single literal node property.
func (txn *Txn) GetProperty(subject uint64, predicate string) (interface{}, error) {
	k := dataKey(txn.db.ns, predicate, subject, math.MaxUint64)
	item, err := txn.Get(k)
	if err != nil {
		return nil, err
	}

	return decodeValue(item)
}

// GetIndexUnique gets the UID of the indexed token that was set with SetLiteral.
func (txn *Txn) GetIndexUnique(predicate string, token []byte) (uint64, error) {
	it := txn.keyIterator(indexPrefix(txn.db.ns, predicate, token))
	defer it.Close()

	var out uint64
	var i int
	for it.Rewind(); it.Valid(); it.Next() {
		pk, err := parseKey(txn.db.ns, it.Item().Key())
		if err != nil {
			return 0, fmt.Errorf("failed to parse key: %w", err)
		}
		out = pk.Subject
		i++
	}

	if i > 1 {
		return 0, fmt.Errorf("found more than one record for unique index")
	}

	if i == 0 {
		return 0, badger.ErrKeyNotFound
	}

	return out, nil
}

// WriteTriple writes the subject-predicate-value triple according to the schema.
func (txn *Txn) WriteTriple(subject uint64, p Predicate, v interface{}) error {
	data, err := encodeValue(v, p.Type)
	if err != nil {
		return fmt.Errorf("failed to encode value: %w", err)
	}

	var cardinality uint64
	if !p.IsList {
		cardinality = math.MaxUint64
	} else {
		cardinality, err = txn.db.cardinality.Next()
		if err != nil {
			return fmt.Errorf("failed to allocate cardinality: %w", err)
		}
	}

	if err := txn.SetEntry(badger.NewEntry(
		dataKey(txn.db.ns, p.FullName(), subject, cardinality),
		data,
	).WithMeta(byte(p.Type))); err != nil {
		return fmt.Errorf("failed to set main entry: %w", err)
	}

	switch {
	case !p.HasIndex:
		return nil
	case p.HasIndex && p.IsRelation():
		if err := txn.Set(reverseKey(txn.db.ns, p.FullName(), v.(uint64), subject), nil); err != nil {
			return fmt.Errorf("failed to set reverse relation: %w", err)
		}
	case p.HasIndex && !p.IsRelation():
		if err := txn.Set(indexKey(txn.db.ns, p.FullName(), data, subject), nil); err != nil {
			return fmt.Errorf("failed to set index: %w", err)
		}
	default:
		panic("BUG: unknown case, something weird happened here")
	}

	return nil
}

// GetForwardRelation returns the object UID of a unique predicate.
func (txn *Txn) GetForwardRelation(subject uint64, predicate string) (uint64, error) {
	it := txn.keyIterator(dataPrefix(txn.db.ns, predicate))
	defer it.Close()

	var out uint64
	var i int
	for it.Rewind(); it.Valid(); it.Next() {
		item := it.Item()
		pk, err := parseKey(txn.db.ns, item.Key())
		if err != nil {
			return 0, err
		}

		if pk.Cardinality != math.MaxUint32 {
			return 0, fmt.Errorf("invalid cardinality for unique relation")
		}

		v, err := decodeValue(it.Item())
		if err != nil {
			return 0, err
		}
		out = v.(uint64)
		i++
	}

	if i > 1 {
		return 0, fmt.Errorf("found more than one record for unique relation")
	}

	if i == 0 {
		return 0, badger.ErrKeyNotFound
	}

	return out, nil
}

// ListIndexedNodes uses indexed token to search for nodes that contain the token.
func (txn *Txn) ListIndexedNodes(predicate string, token []byte) ([]uint64, error) {
	it := txn.keyIterator(indexPrefix(txn.db.ns, predicate, token))
	defer it.Close()

	var out []uint64
	for it.Rewind(); it.Valid(); it.Next() {
		pk, err := parseKey(txn.db.ns, it.Item().Key())
		if err != nil {
			return nil, err
		}
		out = append(out, pk.Subject)
	}

	if out == nil {
		return nil, badger.ErrKeyNotFound // TODO: or return nil, nil?
	}

	return out, nil
}

// ListRelations can be used to read forward relations of a subject.
func (txn *Txn) ListRelations(subject uint64, predicate string) ([]uint64, error) {
	it := txn.valueIterator(dataPrefixSubject(txn.db.ns, predicate, subject))
	defer it.Close()

	var out []uint64
	for it.Rewind(); it.Valid(); it.Next() {
		v, err := decodeValue(it.Item())
		if err != nil {
			return nil, err
		}

		out = append(out, v.(uint64))
	}

	if out == nil {
		return nil, badger.ErrKeyNotFound // TODO: or return nil, nil?
	}

	return out, nil
}

// ListReverseRelations finds reverse relations of a given object and predicate.
func (txn *Txn) ListReverseRelations(predicate string, object uint64) ([]uint64, error) {
	it := txn.keyIterator(reversePrefix(txn.db.ns, predicate, object))
	defer it.Close()

	var out []uint64
	for it.Rewind(); it.Valid(); it.Next() {
		pk, err := parseKey(txn.db.ns, it.Item().Key())
		if err != nil {
			return nil, err
		}
		out = append(out, pk.Subject)
	}

	if out == nil {
		return nil, badger.ErrKeyNotFound // TODO: or return nil, nil?
	}

	return out, nil
}

func (txn *Txn) keyIterator(prefix []byte) *badger.Iterator {
	opts := badger.DefaultIteratorOptions
	opts.Prefix = prefix
	opts.PrefetchValues = false

	return txn.NewIterator(opts)
}

func (txn *Txn) valueIterator(prefix []byte) *badger.Iterator {
	opts := badger.DefaultIteratorOptions
	opts.Prefix = prefix
	return txn.NewIterator(opts)
}

// We want to support having predicates with multiple values,
// e.g. a user with multiple emails. It's recommended to not overwrite
// large values in Badger, thus we want to have a separate keys for each item of the list.
// To differentiate keys we suffix them with a cardinality marker. This could be a timestamp
// or some other unique identifier. To avoid problems with wall clocks we use a separate Badger
// sequence, that is monotonically increasing for the whole database. For predicates with
// single values we use math.MaxUint64 as cardinality marker.
//
// As a consequence, there's no simple way to avoid having multiple records for the same predicate and the same object,
// which may or may not be a problem, but is something to know.
// func (txn *Txn) setPredicate(subject uint64, predicate string, v interface{}, vt ValueType, cardinality uint64, hasInverse bool) error {
// 	data, err := encodeValue(v, vt)
// 	if err != nil {
// 		return fmt.Errorf("failed to encode value: %w", err)
// 	}

// 	k := dataKey(txn.db.ns, predicate, subject, cardinality)

// 	if hasInverse {
// 		if vt == ValueTypeUID {
// 			revK := reverseKey(txn.db.ns, predicate, v.(uint64), subject)
// 			if err := txn.Set(revK, nil); err != nil {
// 				return err
// 			}
// 		} else {
// 			revK := indexKey(txn.db.ns, predicate, data, subject)
// 			if err := txn.Set(revK, nil); err != nil {
// 				return err
// 			}
// 		}
// 	}

// 	return txn.SetEntry(badger.NewEntry(k, data).WithMeta(byte(vt)))
// }
