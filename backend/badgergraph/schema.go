package badgergraph

import (
	"encoding/binary"
	"fmt"
	"reflect"
	"time"

	"github.com/dgraph-io/badger/v3"
	"google.golang.org/protobuf/proto"
)

// NodeType specifies type of a node.
type NodeType string

const (
	predicateXID      = "db/xid" // predicate suffix for node's external id.
	predicateNodeType = "db/type"
)

var nodeTypePredicate = Predicate{
	Name:     predicateNodeType,
	HasIndex: true,
	IsList:   false,
	Type:     ValueTypeString,
}

// SchemaRegistry holds the schema of the graph.
type SchemaRegistry struct {
	schema map[NodeType]map[string]Predicate
}

// NewSchema creates a new schema registry.
func NewSchema() *SchemaRegistry {
	return &SchemaRegistry{
		schema: make(map[NodeType]map[string]Predicate),
	}
}

// Register node type and its corresponding predicates. Must be called before using the database.
func (reg *SchemaRegistry) Register(nodeType string, preds ...Predicate) NodeType {
	nt := NodeType(nodeType)
	_, ok := reg.schema[nt]
	if ok {
		panic("type is already registered: " + nodeType)
	}

	fields := make(map[string]Predicate)
	// Add internal predicate for external ids and node types.
	fields[predicateNodeType] = nodeTypePredicate
	fields[predicateXID] = Predicate{
		Name:     predicateXID + "." + nodeType,
		HasIndex: true,
		IsList:   false,
		Type:     ValueTypeBinary,
	}

	for _, p := range preds {
		if p.Type == ValueTypeUnset {
			panic("missing value type")
		}

		if p.Name == "" {
			panic("missing predicate name")
		}

		if _, ok := fields[p.Name]; ok {
			panic("duplicate predicate " + p.Name)
		}

		fields[p.Name] = p
	}

	reg.schema[nt] = fields

	return nt
}

func (reg *SchemaRegistry) xidPredicate(nodeType NodeType) Predicate {
	return reg.schema[nodeType][predicateXID]
}

// ValueType defines type of the stored value.
type ValueType byte

// Value types.
const (
	ValueTypeUnset  ValueType = 0
	ValueTypeBinary ValueType = 1 << 1
	ValueTypeString ValueType = 1 << 2
	ValueTypeUID    ValueType = 1 << 3
	ValueTypeProto  ValueType = 1 << 4
	ValueTypeTime   ValueType = 1 << 5
)

// Predicate is a descriptor for predicate.
type Predicate struct {
	Name     string
	Type     ValueType
	HasIndex bool
	IsList   bool
}

// String implements fmt.Stringer.
func (p Predicate) String() string {
	return p.Name
}

// IsRelation indicates if the predicate is a relation or simple value.
func (p Predicate) IsRelation() bool {
	return p.Type == ValueTypeUID
}

func encodeValue(v interface{}, t ValueType) ([]byte, error) {
	switch t {
	case ValueTypeUnset:
		panic("BUG: unset value type " + reflect.TypeOf(v).String())
	case ValueTypeBinary:
		vv := v.([]byte)
		out := make([]byte, len(vv))
		if copy(out, vv) != len(vv) {
			return nil, fmt.Errorf("failed to copy bytes")
		}
		return out, nil
	case ValueTypeString:
		switch vv := v.(type) {
		case string:
			return []byte(vv), nil
		case NodeType:
			return []byte(vv), nil
		default:
			panic(fmt.Errorf("invalid type %T for string value type", v))
		}
	case ValueTypeUID:
		out := make([]byte, 8)
		binary.BigEndian.PutUint64(out, v.(uint64))
		return out, nil
	case ValueTypeProto:
		data, err := proto.Marshal(v.(proto.Message))
		if err != nil {
			return nil, fmt.Errorf("failed to marshal proto value: %w", err)
		}
		return data, nil
	case ValueTypeTime:
		data, err := v.(time.Time).MarshalBinary()
		if err != nil {
			return nil, err
		}
		return data, nil
	default:
		return nil, fmt.Errorf("unknown value type: %v", t)
	}
}

func decodeValueBinary(item *badger.Item, dst []byte) ([]byte, error) {
	if vt := item.UserMeta(); ValueType(vt) != ValueTypeBinary {
		return nil, fmt.Errorf("value type is not Binary: %v", vt)
	}
	return item.ValueCopy(dst)
}

func decodeValueString(item *badger.Item) (string, error) {
	if vt := item.UserMeta(); ValueType(vt) != ValueTypeString {
		return "", fmt.Errorf("value type is not String: %v", vt)
	}

	var out string
	err := item.Value(func(v []byte) error {
		out = string(v)
		return nil
	})

	return out, err
}

func decodeValueUID(item *badger.Item) (uint64, error) {
	if vt := item.UserMeta(); ValueType(vt) != ValueTypeUID {
		return 0, fmt.Errorf("value type is not UID: %v", vt)
	}

	var out uint64
	err := item.Value(func(v []byte) error {
		out = binary.BigEndian.Uint64(v)
		return nil
	})

	if out == 0 {
		return 0, fmt.Errorf("invalid value for uid")
	}

	return out, err
}

func decodeValueTime(item *badger.Item) (time.Time, error) {
	if vt := item.UserMeta(); ValueType(vt) != ValueTypeTime {
		return time.Time{}, fmt.Errorf("value type is not Time: %v", vt)
	}

	var t time.Time
	err := item.Value(func(v []byte) error {
		return t.UnmarshalBinary(v)
	})
	return t, err
}

func decodeValueProto(item *badger.Item, msg proto.Message) error {
	if vt := item.UserMeta(); ValueType(vt) != ValueTypeProto {
		return fmt.Errorf("value type is not Proto: %v", vt)
	}

	return item.Value(func(d []byte) error {
		return proto.Unmarshal(d, msg)
	})
}
