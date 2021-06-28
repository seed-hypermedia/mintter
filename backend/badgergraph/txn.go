package badgergraph

import (
	"encoding/binary"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/dgraph-io/badger/v3"
	"go.uber.org/multierr"
	"google.golang.org/protobuf/proto"
)

// NewTransaction starts a new transaction.
func (db *DB) NewTransaction(update bool) *Txn {
	return &Txn{
		Txn:      db.Badger.NewTransaction(update),
		canWrite: update,
		db:       db,
	}
}

// Update wraps read-write transaction handling. Make sure fn
// doesn't have any side-effects, because it will be automatically retried
// on transaction conflict.
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

// XID returns external ID of a given UID. You have to know node type in advance.
func (txn *Txn) XID(nodeType string, uid uint64) ([]byte, error) {
	k := revUIDKey(txn.db.ns, txn.db.schema.xidPredicate(nodeType), uid)
	item, err := txn.Get(k)
	if err != nil {
		return nil, err
	}

	return decodeValueBinary(item, nil)
}

// UID returns a UID for a given node type with a given external id.
// New UIDs can only be allocated in the write mode, so this call will fail
// in read-only transaction when there's no UID allocated already for this node.
//
// IMPORTANT: this may cause transaction conflicts on attempts to allocate UIDs
// for the same node type and xid concurrently. The error must be handled by the caller.
// If transaction is not safe to retry, preallocate UIDs in a separate transaction prior using them.
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

	return txn.uidAllocate(nodeType, xid)
}

// UIDRead reads a previously allocated UID.
func (txn *Txn) UIDRead(nodeType string, xid []byte) (uint64, error) {
	k := uidKey(txn.db.ns, txn.db.schema.xidPredicate(nodeType), xid)
	item, err := txn.Get(k)
	if err != nil {
		return 0, err
	}

	return decodeValueUID(item)
}

// uidAllocate allocates a new uid for node type.
func (txn *Txn) uidAllocate(nodeType string, xid []byte) (uint64, error) {
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

	k := uidKey(txn.db.ns, txn.db.schema.xidPredicate(nodeType), xid)
	data, err := encodeValue(uid, ValueTypeUID)
	if err != nil {
		return 0, fmt.Errorf("failed to encode allocated uid: %w", err)
	}

	if err := txn.SetEntry(badger.NewEntry(k, data).WithMeta(byte(ValueTypeUID)).WithDiscard()); err != nil {
		return 0, err
	}

	k = revUIDKey(txn.db.ns, txn.db.schema.xidPredicate(nodeType), uid)
	if err := txn.SetEntry(badger.NewEntry(k, xid).WithMeta(byte(ValueTypeBinary)).WithDiscard()); err != nil {
		return 0, err
	}

	if err := txn.WriteTriple(uid, txn.db.schema.schema[nodeType][predicateNodeType], nodeType); err != nil {
		return 0, err
	}

	return uid, err
}

// GetPropertyBinary is a type-specific way of getting a Binary property.
func (txn *Txn) GetPropertyBinary(subject uint64, p Predicate) ([]byte, error) {
	it, err := txn.getProperty(subject, p)
	if err != nil {
		return nil, err
	}

	return decodeValueBinary(it, nil)
}

// GetPropertyString is a type-specific way of getting a String property.
func (txn *Txn) GetPropertyString(subject uint64, p Predicate) (string, error) {
	it, err := txn.getProperty(subject, p)
	if err != nil {
		return "", err
	}

	return decodeValueString(it)
}

// GetPropertyUID is a type-specific way of getting a UID property (a relation).
func (txn *Txn) GetPropertyUID(subject uint64, p Predicate) (uint64, error) {
	it, err := txn.getProperty(subject, p)
	if err != nil {
		return 0, err
	}

	return decodeValueUID(it)
}

// GetPropertyProto is a type-specific way of getting a Proto property.
func (txn *Txn) GetPropertyProto(subject uint64, p Predicate, msg proto.Message) error {
	it, err := txn.getProperty(subject, p)
	if err != nil {
		return err
	}

	return decodeValueProto(it, msg)
}

// GetPropertyTime is a type-specific way of getting a Time property.
func (txn *Txn) GetPropertyTime(subject uint64, p Predicate) (time.Time, error) {
	it, err := txn.getProperty(subject, p)
	if err != nil {
		return time.Time{}, err
	}

	return decodeValueTime(it)
}

func (txn *Txn) getProperty(subject uint64, p Predicate) (*badger.Item, error) {
	k := dataKey(txn.db.ns, p.fullName, subject, math.MaxUint64)
	item, err := txn.Get(k)
	if err != nil {
		return nil, err
	}

	return item, nil
}

// HasProperty checks if a property exists without decoding the value.
func (txn *Txn) HasProperty(subject uint64, p Predicate) (bool, error) {
	k := dataKey(txn.db.ns, p.fullName, subject, math.MaxUint64)
	_, err := txn.Get(k)
	if err == nil {
		return true, nil
	}

	if err != badger.ErrKeyNotFound {
		return false, err
	}

	return false, nil
}

// GetIndexUnique gets the UID of the indexed token that was set with SetLiteral.
func (txn *Txn) GetIndexUnique(p Predicate, token []byte) (uint64, error) {
	it := txn.keyIterator(indexPrefix(txn.db.ns, p.fullName, token))
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
		dataKey(txn.db.ns, p.fullName, subject, cardinality),
		data,
	).WithMeta(byte(p.Type)).WithDiscard()); err != nil {
		return fmt.Errorf("failed to set main entry: %w", err)
	}

	switch {
	case !p.HasIndex:
		return nil
	case p.HasIndex && p.IsRelation():
		if err := txn.Set(reverseKey(txn.db.ns, p.fullName, v.(uint64), subject), nil); err != nil {
			return fmt.Errorf("failed to set reverse relation: %w", err)
		}
	case p.HasIndex && !p.IsRelation():
		if err := txn.Set(indexKey(txn.db.ns, p.fullName, data, subject), nil); err != nil {
			return fmt.Errorf("failed to set index: %w", err)
		}
	default:
		panic("BUG: unknown case, something weird happened here")
	}

	return nil
}

// ListIndexedNodes uses indexed token to search for nodes that contain the token.
func (txn *Txn) ListIndexedNodes(p Predicate, token []byte) ([]uint64, error) {
	var prefix []byte
	if token != nil {
		prefix = indexPrefix(txn.db.ns, p.fullName, token)
	} else {
		prefix, _ = makeKey(txn.db.ns, prefixDefault, keyTypeIndex, p.fullName, 0)
	}
	it := txn.keyIterator(prefix)
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
func (txn *Txn) ListRelations(subject uint64, p Predicate) ([]uint64, error) {
	it := txn.valueIterator(dataPrefixSubject(txn.db.ns, p.fullName, subject))
	defer it.Close()

	var out []uint64
	for it.Rewind(); it.Valid(); it.Next() {
		uid, err := decodeValueUID(it.Item())
		if err != nil {
			return nil, err
		}
		out = append(out, uid)
	}

	if out == nil {
		return nil, badger.ErrKeyNotFound // TODO: or return nil, nil?
	}

	return out, nil
}

// ListReverseRelations finds reverse relations of a given object and predicate.
func (txn *Txn) ListReverseRelations(p Predicate, object uint64) ([]uint64, error) {
	it := txn.keyIterator(reversePrefix(txn.db.ns, p.fullName, object))
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

// DeleteNode removes a node from the database including all its predicates and indexes.
func (txn *Txn) DeleteNode(nodeType string, xid []byte) error {
	uid, err := txn.UIDRead(nodeType, xid)
	if err != nil {
		return err
	}

	var wg sync.WaitGroup
	keysc := make(chan []byte, len(txn.db.schema.schema[nodeType])*2)

	for _, pred := range txn.db.schema.schema[nodeType] {
		it := txn.keyIterator(dataPrefixSubject(txn.db.ns, pred.fullName, uid))
		defer it.Close()

		wg.Add(1)
		go func(it *badger.Iterator, pred Predicate) {
			defer wg.Done()

			for it.Rewind(); it.Valid(); it.Next() {
				keysc <- it.Item().KeyCopy(nil)
			}
		}(it, pred)

		if pred.HasIndex {
			kt := keyTypeIndex
			if pred.IsRelation() {
				kt = keyTypeReverse
			}

			prefix, _ := makeKey(txn.db.ns, prefixDefault, kt, pred.fullName, 0)
			it := txn.keyIterator(prefix)
			defer it.Close()

			wg.Add(1)
			go func(it *badger.Iterator, pred Predicate) {
				defer wg.Done()

				for it.Rewind(); it.Valid(); it.Next() {
					k := it.Item().KeyCopy(nil)
					subject := binary.BigEndian.Uint64(k[len(k)-8:])
					if subject != uid {
						continue
					}
					keysc <- k
				}
			}(it, pred)
		}
	}

	// We don't know if keysc has enough buffer to receive all the keys to delete,
	// Thus we have to wait until all the goroutines finish, and then close the keysc,
	// so that the iterator bellow knows how to exit.
	go func() {
		wg.Wait()
		close(keysc)
	}()

	var outErr error
	for k := range keysc {
		if err := txn.Delete(k); err != nil {
			outErr = multierr.Append(outErr, err)
		}
	}

	multierr.Append(outErr, txn.Delete(uidKey(txn.db.ns, txn.db.schema.xidPredicate(nodeType), xid)))
	multierr.Append(outErr, txn.Delete(revUIDKey(txn.db.ns, txn.db.schema.xidPredicate(nodeType), uid)))

	return outErr
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
