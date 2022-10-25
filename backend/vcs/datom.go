package vcs

import (
	"mintter/backend/vcs/crdt"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

// Attribute is a type for predicate attributes.
type Attribute string

// ValueType is a type for Datom's value type.
type ValueType byte

// Supported value types.
const (
	ValueTypeRef    ValueType = 0
	ValueTypeString ValueType = 1
	ValueTypeInt    ValueType = 2
	ValueTypeBool   ValueType = 3
	ValueTypeBytes  ValueType = 4
	ValueTypeCID    ValueType = 5
	ValueTypeCBOR   ValueType = 6
)

// GetValueType returns value type for v.
func GetValueType(v any) ValueType {
	switch v.(type) {
	case NodeID:
		return ValueTypeRef
	case string:
		return ValueTypeString
	case int:
		return ValueTypeInt
	case bool:
		return ValueTypeBool
	case []byte:
		return ValueTypeBytes
	case cid.Cid:
		return ValueTypeCID
	case CBORMarshaler:
		return ValueTypeCBOR
	default:
		panic("BUG: unknown value type")
	}
}

// Datom is a fact about some entity within a Mintter Object.
type Datom struct {
	Entity    NodeID
	Attr      Attribute
	ValueType ValueType
	Value     any
	Time      int64  // Hybrid Logical Timestamp.
	Origin    uint64 // Abbreviated device ID.
}

// NewDatom creates a new Datom.
func NewDatom(e NodeID, a Attribute, value any, hlcTime int64, origin uint64) Datom {
	return Datom{
		Entity:    e,
		Attr:      a,
		ValueType: GetValueType(value),
		Value:     value,
		Time:      hlcTime,
		Origin:    origin,
	}
}

// IsZero checks if datom is zero value.
func (d Datom) IsZero() bool {
	return d.Entity.IsZero()
}

// OpID returns an ID for CRDT conflict resolution.
func (d Datom) OpID() crdt.OpID {
	return crdt.OpID{uint64(d.Time), d.Origin}
}

// CBORMarshaler is an interface for marshaling CBOR data.
type CBORMarshaler interface {
	MarshalCBOR() ([]byte, error)
}

type cborValue struct {
	v any
}

func (c cborValue) MarshalCBOR() ([]byte, error) {
	return cbornode.DumpObject(c.v)
}

// CBORValue wraps v into a CBORMarshaler.
func CBORValue(v any) CBORMarshaler {
	return cborValue{v}
}
