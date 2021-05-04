package badgergraph

import (
	"encoding/binary"
	"fmt"
	"math"

	"github.com/dgraph-io/badger/v3"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

// PredicateNodeType is an internal predicate that specified type of the node.
const PredicateNodeType = "$type"

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
	xidPredicate := nodeType + ".$xid"
	if xid == nil {
		panic("BUG: can't allocate uids for nodes without external ids yet")
	}

	uid, err := txn.GetIndexUnique(xidPredicate, xid)
	if err == nil {
		return uid, nil
	}

	if err != badger.ErrKeyNotFound {
		return 0, err
	}

	if !txn.canWrite {
		return 0, err
	}

	uid, err = txn.db.uids.Next()
	if err != nil {
		return 0, err
	}

	if err := txn.SetProperty(uid, xidPredicate, xid, true); err != nil {
		return 0, err
	}

	if err := txn.SetProperty(uid, PredicateNodeType, nodeType, true); err != nil {
		return 0, err
	}

	return uid, nil
}

// SetProperty sets a single literal node property.
func (txn *Txn) SetProperty(subject uint64, predicate string, value interface{}, index bool) error {
	var vt ValueType
	switch value.(type) {
	case string:
		vt = ValueTypeString
	case []byte:
		vt = ValueTypeBinary
	case proto.Message:
		vt = ValueTypeProto
	default:
		panic("invalid value type for literal predicate")
	}

	return txn.setPredicate(subject, predicate, value, vt, math.MaxUint64, index)
}

// GetProperty reads a single literal node property.
func (txn *Txn) GetProperty(subject uint64, predicate string) (interface{}, error) {
	k := dataKey(txn.db.ns, predicate, subject, math.MaxUint64)
	item, err := txn.Get(k)
	if err != nil {
		return nil, err
	}

	return txn.valueFromItem(item)
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

// SetRelation sets a unique relation between subject and object.
func (txn *Txn) SetRelation(subject uint64, predicate string, object uint64, index bool) error {
	return txn.setPredicate(subject, predicate, object, ValueTypeUID, math.MaxUint64, index)
}

// AddRelation adds a relation between subject and object. Many relations can be added.
func (txn *Txn) AddRelation(subject uint64, predicate string, object uint64, index bool) error {
	// TODO: do not allow adding same relation for the same subject and object to be added more than once.
	card, err := txn.db.cardinality.Next()
	if err != nil {
		return fmt.Errorf("failed to get cardinality for relation: %w", err)
	}

	return txn.setPredicate(subject, predicate, object, ValueTypeUID, card, index)
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

		v, err := txn.valueFromItem(it.Item())
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
		v, err := txn.valueFromItem(it.Item())
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

// func (txn *Txn) LookupIndex(predicate string, token []byte) (uint64, error) {
// 	var out uint64
// 	err := txn.ScanIndex(predicate, token, func(i int, uid uint64) error {
// 		if i == 0 {
// 			out = uid
// 		} else {
// 			return fmt.Errorf("found more than one indexed value for predicate: %s", predicate)
// 		}

// 		return nil
// 	})

// 	if out == 0 {
// 		return 0, badger.ErrKeyNotFound
// 	}

// 	return out, err
// }

// // AddIndex adds an index for a uid that contains a token.
// // For indexing UID-values use ReverseIndex instead.
// func (txn *Txn) AddIndex(predicate string, token []byte, uid uint64) error {
// 	// <predicate>:<index>:<token-length>:<token>:<uid-value>

// 	l := len(token)
// 	if l > math.MaxUint16 {
// 		panic("token is too long")
// 	}
// 	tlen := uint16(l)
// 	k, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeIndex, predicate, 2+l+8)
// 	binary.BigEndian.PutUint16(k[pos:], tlen)
// 	pos += 2
// 	pos += copy(k[pos:], token)
// 	binary.BigEndian.PutUint64(k[pos:], uid)

// 	return txn.SetEntry(badger.NewEntry(k, nil))
// }

// ScanIndex iterates over index keys for a given predicate and call the given callback function for each.
// func (txn *Txn) ScanIndex(predicate string, token []byte, cb func(idx int, uid uint64) error) error {
// 	opts := badger.DefaultIteratorOptions
// 	opts.Prefix = indexPrefix(txn.db.ns, predicate, token)
// 	opts.PrefetchValues = false

// 	it := txn.NewIterator(opts)
// 	defer it.Close()

// 	var i int

// 	for it.Rewind(); it.Valid(); it.Next() {
// 		k := it.Item().Key()
// 		start := len(k) - 8 - 8 - 8
// 		end := start + 8
// 		uid := binary.BigEndian.Uint64(k[start:end])
// 		if err := cb(i, uid); err != nil {
// 			return err
// 		}
// 		i++
// 	}

// 	if i == 0 {
// 		return badger.ErrKeyNotFound
// 	}

// 	return nil
// }

// func (txn *Txn) ScanReverseIndex(predicate string, object uint64, cb func(i int, subject, ts, idx uint64) error) error {
// 	prefix, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeReverse, predicate, 8)
// 	binary.BigEndian.PutUint64(prefix[pos:], object)

// 	// <predicate>:<reverse>:<value-uid>:<subject>:<ts>:<idx>

// 	opts := badger.DefaultIteratorOptions
// 	opts.Prefix = prefix
// 	opts.PrefetchValues = false

// 	it := txn.NewIterator(opts)
// 	defer it.Close()

// 	var i int

// 	for it.Rewind(); it.Valid(); it.Next() {
// 		k := it.Item().Key()
// 		subject := binary.BigEndian.Uint64(k[len(k)-8-8-8:])
// 		ts := binary.BigEndian.Uint64(k[len(k)-8-8:])
// 		idx := binary.BigEndian.Uint64(k[len(k)-8:])

// 		if subject == 0 {
// 			return fmt.Errorf("wrong subject")
// 		}

// 		// TODO: do we need this?

// 		// if ts == 0 {
// 		// 	return fmt.Errorf("wrong ts")
// 		// }

// 		if err := cb(i, subject, ts, idx); err != nil {
// 			return err
// 		}
// 		i++
// 	}

// 	if i == 0 {
// 		return badger.ErrKeyNotFound
// 	}

// 	return nil
// }

// func (txn *Txn) ScanPredicate(subject uint64, predicate string, cb func(i int, v interface{}) error) error {
// 	prefix, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeData, predicate, 8)
// 	binary.BigEndian.PutUint64(prefix[pos:], subject)

// 	opts := badger.DefaultIteratorOptions
// 	opts.Prefix = prefix

// 	it := txn.NewIterator(opts)
// 	defer it.Close()

// 	var i int

// 	for it.Rewind(); it.Valid(); it.Next() {
// 		v, err := txn.valueFromItem(it.Item())
// 		if err != nil {
// 			return err
// 		}

// 		if err := cb(i, v); err != nil {
// 			return err
// 		}
// 		i++
// 	}

// 	if i == 0 {
// 		return badger.ErrKeyNotFound
// 	}

// 	return nil
// }

// // SetPredicate sets the value on the predicate for a subject. Value's concrete type must correspond
// // to the value type parameter specified. This will treat the predicate as a uniq value, e.g.
// // attributes or one-to-one relationships.
// func (txn *Txn) SetPredicate(subject uint64, predicate string, v interface{}, vt ValueType) error {
// 	// check if predicate is multi or uniq
// 	// if multi - get cardinality marker
// 	return txn.setPredicate(subject, predicate, v, vt, 0, 0, false)
// }

// func (txn *Txn) SetPredicateWithInverse(subject uint64, predicate string, v interface{}, vt ValueType) error {
// 	if vt != ValueTypeUID {
// 		return fmt.Errorf("can only use UID for inverse predicates")
// 	}

// 	return txn.setPredicate(subject, predicate, v, vt, 0, 0, true)
// }

// func (txn *Txn) AddPredicateWithInverse(subject uint64, predicate string, v interface{}, vt ValueType) error {
// 	if vt != ValueTypeUID {
// 		return fmt.Errorf("can only use UID for inverse predicates")
// 	}

// 	if err := txn.setPredicate(subject, predicate, v, vt, txn.startTimeUnixNano, txn.cardinalityCount[predicate], true); err != nil {
// 		return err
// 	}

// 	txn.cardinalityCount[predicate]++

// 	return nil
// }

// // AddPredicate adds the value for the predicate for a subject. This can be used to set multiple values to the predicate,
// // e.g. Alice follows John, and Alice follows Bob.
// func (txn *Txn) AddPredicate(subject uint64, predicate string, v interface{}, vt ValueType) error {
// 	if err := txn.setPredicate(subject, predicate, v, vt, txn.startTimeUnixNano, txn.cardinalityCount[predicate], false); err != nil {
// 		return err
// 	}

// 	txn.cardinalityCount[predicate]++

// 	return nil
// }

// // GetPredicate gets the value for the predicate with unique constraint.
// func (txn *Txn) GetPredicate(subject uint64, predicate string) (interface{}, error) {
// 	return txn.LookupPredicate(subject, predicate, 0, 0)
// }

// // LookupPredicate is similar to GetPredicate but allows to pass specific ts and idx values.
// // Useful for getting predicates from reverse indices.
// func (txn *Txn) LookupPredicate(subject uint64, predicate string, ts, idx uint64) (interface{}, error) {
// 	k, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeData, predicate, 8+8+8)
// 	binary.BigEndian.PutUint64(k[pos:], subject)
// 	pos += 8
// 	binary.BigEndian.PutUint64(k[pos:], ts)
// 	pos += 8
// 	binary.BigEndian.PutUint64(k[pos:], idx)

// 	item, err := txn.Get(k)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return txn.valueFromItem(item)
// }

func (txn *Txn) valueFromItem(item *badger.Item) (interface{}, error) {
	switch ValueType(item.UserMeta()) {
	case ValueTypeString:
		var out string
		err := item.Value(func(v []byte) error {
			out = string(v)
			return nil
		})
		return out, err
	case ValueTypeBinary:
		var out []byte
		err := item.Value(func(v []byte) error {
			out = append(out, v...) // must copy the value here.
			return nil
		})
		return out, err
	case ValueTypeUID:
		var out uint64
		err := item.Value(func(v []byte) error {
			out = binary.BigEndian.Uint64(v)
			return nil
		})
		if out == 0 {
			return nil, fmt.Errorf("invalid value for uid")
		}
		return out, err
	case ValueTypeProto:
		any := &anypb.Any{}
		err := item.Value(func(v []byte) error {
			return proto.Unmarshal(v, any)
		})
		if err != nil {
			return nil, err
		}
		out, err := anypb.UnmarshalNew(any, proto.UnmarshalOptions{})
		if err != nil {
			return nil, err
		}
		return out, err
	default:
		panic("unknown value type when reading predicate")
	}
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
func (txn *Txn) setPredicate(subject uint64, predicate string, v interface{}, vt ValueType, cardinality uint64, hasInverse bool) error {
	var data []byte
	switch vt {
	case ValueTypeString:
		data = []byte(v.(string))
	case ValueTypeBinary:
		data = v.([]byte)
	case ValueTypeUID:
		data = make([]byte, 8)
		binary.BigEndian.PutUint64(data, v.(uint64))
	case ValueTypeProto:
		any, err := anypb.New(v.(proto.Message))
		if err != nil {
			return err
		}

		data, err = proto.Marshal(any)
		if err != nil {
			return fmt.Errorf("failed to marshal proto value: %w", err)
		}
	default:
		panic("BUG: unknown value type")
	}

	k := dataKey(txn.db.ns, predicate, subject, cardinality)

	if hasInverse {
		if vt == ValueTypeUID {
			revK := reverseKey(txn.db.ns, predicate, v.(uint64), subject)
			if err := txn.Set(revK, nil); err != nil {
				return err
			}
		} else {
			revK := indexKey(txn.db.ns, predicate, data, subject)
			if err := txn.Set(revK, nil); err != nil {
				return err
			}
		}
	}

	return txn.SetEntry(badger.NewEntry(k, data).WithMeta(byte(vt)))
}

// ValueType defines type of the stored value.
type ValueType byte

// Value types.
const (
	ValueTypeBinary ValueType = 0x01
	ValueTypeString ValueType = 0x02
	ValueTypeUID    ValueType = 0x03
	ValueTypeProto  ValueType = 0x04
)
