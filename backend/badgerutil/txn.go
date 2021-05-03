package badgerutil

import (
	"encoding/binary"
	"fmt"
	"math"
	"time"

	"github.com/dgraph-io/badger/v3"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

func (db *DB) NewTransaction(update bool) *Txn {
	return &Txn{
		Txn:               db.DB.NewTransaction(update),
		db:                db,
		startTimeUnixNano: uint64(time.Now().UnixNano()),
		cardinalityCount:  make(map[string]uint64),
	}
}

func (db *DB) Update(fn func(txn *Txn) error) error {
	txn := db.NewTransaction(true)
	defer txn.Discard()

	if err := fn(txn); err != nil {
		return err
	}

	return txn.Commit()
}

func (db *DB) View(fn func(txn *Txn) error) error {
	txn := db.NewTransaction(false)
	defer txn.Discard()

	return fn(txn)
}

type Txn struct {
	*badger.Txn
	db                *DB
	startTimeUnixNano uint64
	cardinalityCount  map[string]uint64
}

func (txn *Txn) GetXID(nodeType string, uid uint64) ([]byte, error) {
	v, err := txn.GetPredicate(1, nodeType+".$xid")
	if err != nil {
		return nil, err
	}

	return v.([]byte), nil
}

// UID returns a UID for a given node type with a given external id.
func (txn *Txn) UID(nodeType string, xid []byte) (uint64, error) {
	xidPredicate := nodeType + ".$xid"
	if xid != nil {
		uid, err := txn.LookupIndex(xidPredicate, xid)
		if err == nil {
			return uid, nil
		}

		if err != badger.ErrKeyNotFound {
			return 0, err
		}
	}

	uid, err := txn.db.seq.Next()
	if err != nil {
		return 0, err
	}

	// TODO: add tests for nodes with no xid.
	if xid != nil {
		if err := txn.SetPredicate(uid, xidPredicate, xid, ValueTypeBinary); err != nil {
			return 0, err
		}

		if err := txn.AddIndex(xidPredicate, xid, uid); err != nil {
			return 0, err
		}
	}

	if err := txn.SetPredicate(uid, "$type", nodeType, ValueTypeString); err != nil {
		return 0, err
	}

	if err := txn.AddIndex("$type", []byte(nodeType), uid); err != nil {
		return 0, err
	}

	return uid, nil

	// If xid == nil don't lookup and don't generate index.
	// Lookup
	// <nodetype/$uid>:<index>:<token-length>:<xid>:<uid>
	// return uid if found
	// Otherwise allocate uid.
	// Set index.
	// Set <$type>:<data>:<uid>:<0>:<0> => nodeType
}

// UIDRead is like UID, but doesn't allocate new UIDs and only works with already existing ones.
func (txn *Txn) UIDRead(nodeType string, xid []byte) (uint64, error) {
	if xid == nil {
		return 0, fmt.Errorf("can't read uid for a node with no xid")
	}

	uidPredicate := nodeType + ".$xid"
	uid, err := txn.LookupIndex(uidPredicate, xid)
	return uid, err
}

func (txn *Txn) LookupIndex(predicate string, token []byte) (uint64, error) {
	var out uint64
	err := txn.ScanIndex(predicate, token, func(i int, uid uint64) error {
		if i == 0 {
			out = uid
		} else {
			return fmt.Errorf("found more than one indexed value for predicate: %s", predicate)
		}

		return nil
	})

	if out == 0 {
		return 0, badger.ErrKeyNotFound
	}

	return out, err
}

// AddIndex adds an index for a uid that contains a token.
// For indexing UID-values use ReverseIndex instead.
func (txn *Txn) AddIndex(predicate string, token []byte, uid uint64) error {
	// <predicate>:<index>:<token-length>:<token>:<uid-value>

	l := len(token)
	if l > math.MaxUint16 {
		panic("token is too long")
	}
	tlen := uint16(l)
	k, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeIndex, predicate, 2+l+8)
	binary.BigEndian.PutUint16(k[pos:], tlen)
	pos += 2
	pos += copy(k[pos:], token)
	binary.BigEndian.PutUint64(k[pos:], uid)

	return txn.SetEntry(badger.NewEntry(k, nil))
}

// ScanIndex iterates over index keys for a given predicate and call the given callback function for each.
func (txn *Txn) ScanIndex(predicate string, token []byte, cb func(idx int, uid uint64) error) error {
	l := len(token)
	if l > math.MaxUint16 {
		panic("token is too long")
	}
	tlen := uint16(l)
	prefix, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeIndex, predicate, 2+l)
	binary.BigEndian.PutUint16(prefix[pos:], tlen)
	pos += 2
	copy(prefix[pos:], token)

	opts := badger.DefaultIteratorOptions
	opts.Prefix = prefix
	opts.PrefetchValues = false

	it := txn.NewIterator(opts)
	defer it.Close()

	var i int

	for it.Rewind(); it.Valid(); it.Next() {
		k := it.Item().Key()
		uid := binary.BigEndian.Uint64(k[len(k)-8:])
		if err := cb(i, uid); err != nil {
			return err
		}
		i++
	}

	if i == 0 {
		return badger.ErrKeyNotFound
	}

	return nil
}

func (txn *Txn) ScanReverseIndex(predicate string, object uint64, cb func(i int, subject, ts, idx uint64) error) error {
	prefix, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeReverse, predicate, 8)
	binary.BigEndian.PutUint64(prefix[pos:], object)

	// <predicate>:<reverse>:<value-uid>:<subject>:<ts>:<idx>

	opts := badger.DefaultIteratorOptions
	opts.Prefix = prefix
	opts.PrefetchValues = false

	it := txn.NewIterator(opts)
	defer it.Close()

	var i int

	for it.Rewind(); it.Valid(); it.Next() {
		k := it.Item().Key()
		subject := binary.BigEndian.Uint64(k[len(k)-8-8-8:])
		ts := binary.BigEndian.Uint64(k[len(k)-8-8:])
		idx := binary.BigEndian.Uint64(k[len(k)-8:])

		if subject == 0 {
			return fmt.Errorf("wrong subject")
		}

		if ts == 0 {
			return fmt.Errorf("wrong ts")
		}

		if err := cb(i, subject, ts, idx); err != nil {
			return err
		}
		i++
	}

	if i == 0 {
		return badger.ErrKeyNotFound
	}

	return nil
}

func (txn *Txn) ScanPredicate(subject uint64, predicate string, cb func(i int, v interface{}) error) error {
	prefix, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeData, predicate, 8)
	binary.BigEndian.PutUint64(prefix[pos:], subject)

	opts := badger.DefaultIteratorOptions
	opts.Prefix = prefix

	it := txn.NewIterator(opts)
	defer it.Close()

	var i int

	for it.Rewind(); it.Valid(); it.Next() {
		v, err := txn.valueFromItem(it.Item())
		if err != nil {
			return err
		}

		if err := cb(i, v); err != nil {
			return err
		}
		i++
	}

	if i == 0 {
		return badger.ErrKeyNotFound
	}

	return nil
}

// SetPredicate sets the value on the predicate for a subject. Value's concrete type must correspond
// to the value type parameter specified. This will treat the predicate as a uniq value, e.g.
// attributes or one-to-one relationships.
func (txn *Txn) SetPredicate(subject uint64, predicate string, v interface{}, vt ValueType) error {
	// check if predicate is multi or uniq
	// if multi - get cardinality marker
	return txn.setPredicate(subject, predicate, v, vt, 0, 0, false)
}

func (txn *Txn) SetPredicateWithInverse(subject uint64, predicate string, v interface{}, vt ValueType) error {
	if vt != ValueTypeUID {
		return fmt.Errorf("can only use UID for inverse predicates")
	}

	return txn.setPredicate(subject, predicate, v, vt, 0, 0, true)
}

func (txn *Txn) AddPredicateWithInverse(subject uint64, predicate string, v interface{}, vt ValueType) error {
	if vt != ValueTypeUID {
		return fmt.Errorf("can only use UID for inverse predicates")
	}

	if err := txn.setPredicate(subject, predicate, v, vt, txn.startTimeUnixNano, txn.cardinalityCount[predicate], true); err != nil {
		return err
	}

	txn.cardinalityCount[predicate]++

	return nil
}

// AddPredicate adds the value for the predicate for a subject. This can be used to set multiple values to the predicate,
// e.g. Alice follows John, and Alice follows Bob.
func (txn *Txn) AddPredicate(subject uint64, predicate string, v interface{}, vt ValueType) error {
	if err := txn.setPredicate(subject, predicate, v, vt, txn.startTimeUnixNano, txn.cardinalityCount[predicate], false); err != nil {
		return err
	}

	txn.cardinalityCount[predicate]++

	return nil
}

// GetPredicate gets the value for the predicate with unique constraint.
func (txn *Txn) GetPredicate(subject uint64, predicate string) (interface{}, error) {
	return txn.LookupPredicate(subject, predicate, 0, 0)
}

// LookupPredicate is similar to GetPredicate but allows to pass specific ts and idx values.
// Useful for getting predicates from reverse indices.
func (txn *Txn) LookupPredicate(subject uint64, predicate string, ts, idx uint64) (interface{}, error) {
	k, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeData, predicate, 8+8+8)
	binary.BigEndian.PutUint64(k[pos:], subject)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], ts)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], idx)

	item, err := txn.Get(k)
	if err != nil {
		return nil, err
	}

	return txn.valueFromItem(item)
}

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

func (txn *Txn) setPredicate(subject uint64, predicate string, v interface{}, vt ValueType, ts, idx uint64, hasInverse bool) error {
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

	k, pos := makeKey(txn.db.ns, PrefixDefault, KeyTypeData, predicate, 8+8+8)
	binary.BigEndian.PutUint64(k[pos:], subject)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], ts)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], idx)

	if hasInverse && vt == ValueTypeUID {
		// <predicate>:<reverse>:<value-uid>:<subject>:<ts>:<idx>
		revK, revPos := makeKey(txn.db.ns, PrefixDefault, KeyTypeReverse, predicate, 8*4)
		revPos += copy(revK[revPos:], data)
		copy(revK[revPos:], k[len(k)-8-8-8:]) // copy subject:ts:idx from the original relation.

		if err := txn.Set(revK, nil); err != nil {
			return err
		}
	}

	return txn.SetEntry(badger.NewEntry(k, data).WithMeta(byte(vt)))
}

// ValueType defines type of the stored value.
type ValueType byte

const (
	ValueTypeBinary ValueType = 0x00
	ValueTypeString ValueType = 0x01
	ValueTypeUID    ValueType = 0x02
	ValueTypeProto  ValueType = 0x03
)

func valueKey(namespace, predicate string, cardinality, uid uint64) []byte {
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeData, predicate, 8+8) // 8 bytes for cardinality and uid.
	binary.BigEndian.PutUint64(k[pos:], cardinality)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], uid)
	return k
}
