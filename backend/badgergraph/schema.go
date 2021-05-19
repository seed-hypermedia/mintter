package badgergraph

import (
	"encoding/binary"
	"fmt"

	"github.com/dgraph-io/badger/v3"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

const (
	predicateXID      = "$xid" // predicate suffix for node's external id.
	predicateNodeType = "$type"
)

// SchemaRegistry holds the schema of the graph.
type SchemaRegistry struct {
	schema map[string]map[string]Predicate
}

// NewSchema creates a new schema registry.
func NewSchema() SchemaRegistry {
	return SchemaRegistry{
		schema: make(map[string]map[string]Predicate),
	}
}

// RegisterType registers a type. Useful to register types with only internal predicates.
func (reg *SchemaRegistry) RegisterType(nodeType string) {
	_, ok := reg.schema[nodeType]
	if ok {
		panic("type is already registered")
	}

	fields := make(map[string]Predicate)
	// Add internal predicate for external ids and node types.
	fields[predicateNodeType] = Predicate{
		node:     "!internal!",
		fullName: predicateNodeType, // This predicate doesn't have nodetype prefix because we want to index across all node types.
		Name:     predicateNodeType,
		HasIndex: true,
		IsList:   false,
		Type:     ValueTypeString,
	}
	xid := nodeType + "." + predicateXID
	fields[predicateXID] = Predicate{
		node:     nodeType,
		fullName: xid,
		HasIndex: true,
		IsList:   false,
		Type:     ValueTypeBinary,
	}
	reg.schema[nodeType] = fields
}

// RegisterPredicate registers a predicate in the schema.
// All predicates must be registered before using the database.
// Not safe for concurrent use.
// Will panic if duplicate predicate is being registered.
func (reg *SchemaRegistry) RegisterPredicate(nodeType string, p Predicate) Predicate {
	if p.node != "" {
		panic("BUG: predicate with node specified being registered")
	}

	if p.Type == ValueTypeUnset {
		panic("missing value type")
	}

	if p.Name == "" {
		panic("missing predicate name")
	}

	p.node = nodeType
	p.fullName = nodeType + "." + p.Name

	fields, ok := reg.schema[nodeType]
	if !ok {
		reg.RegisterType(nodeType)
		fields, ok = reg.schema[nodeType]
		if !ok {
			panic("BUG: failed to register type")
		}
	}

	if _, ok := fields[p.Name]; ok {
		panic("duplicate predicate being registered")
	}

	fields[p.Name] = p

	return p
}

// ValueType defines type of the stored value.
type ValueType byte

// Value types.
const (
	ValueTypeUnset  ValueType = 0
	ValueTypeBinary ValueType = 0x01
	ValueTypeString ValueType = 0x02
	ValueTypeUID    ValueType = 0x03
	ValueTypeProto  ValueType = 0x04
)

// Predicate is a descriptor for predicate.
type Predicate struct {
	node     string
	fullName string

	Name     string
	Type     ValueType
	HasIndex bool
	IsList   bool
}

// FullName returns full name of the predicate (<nodeType>.<field>).
func (p Predicate) FullName() string {
	return p.fullName
}

// IsRelation indicates if the predicate is a relation or simple value.
func (p Predicate) IsRelation() bool {
	return p.Type == ValueTypeUID
}

// NodeType returns the type of the node this predicate is registered for.
func (p Predicate) NodeType() string {
	return p.node
}

func encodeValue(v interface{}, t ValueType) ([]byte, error) {
	switch t {
	case ValueTypeUnset:
		panic("BUG: unset value type")
	case ValueTypeBinary:
		vv := v.([]byte)
		out := make([]byte, len(vv))
		if copy(out, vv) != len(vv) {
			return nil, fmt.Errorf("failed to copy bytes")
		}
		return out, nil
	case ValueTypeString:
		return []byte(v.(string)), nil
	case ValueTypeUID:
		out := make([]byte, 8)
		binary.BigEndian.PutUint64(out, v.(uint64))
		return out, nil
	case ValueTypeProto:
		any, err := anypb.New(v.(proto.Message))
		if err != nil {
			return nil, err
		}
		data, err := proto.Marshal(any)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal proto value: %w", err)
		}
		return data, nil
	default:
		return nil, fmt.Errorf("unknown value type: %v", t)
	}
}

func decodeValue(item *badger.Item) (interface{}, error) {
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
