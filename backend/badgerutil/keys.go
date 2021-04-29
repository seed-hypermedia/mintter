package badgerutil

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"math"
)

const (
	PrefixDefault  byte = 0x00
	PrefixInternal byte = 0x02

	KeyTypeData  byte = 0x00
	KeyTypeIndex byte = 0x02
)

// UIDKey creates a key for the uid value.
func UIDKey(namespace, kind, xid []byte) []byte {
	lk := len(kind)
	lx := len(xid)
	k, pos := makeKeyBuf(namespace, PrefixInternal, KeyTypeIndex, uidPred, lk+lx)
	pos += copy(k[pos:], kind)
	pos += copy(k[pos:], xid)
	return k
}

// DataKey creates a new key for data attribute.
func DataKey(namespace, predicate []byte, uid uint64) []byte {
	k, pos := makeKeyBuf(namespace, PrefixDefault, KeyTypeData, predicate, 8) // 8 bytes for uid.
	binary.BigEndian.PutUint64(k[pos:], uid)
	return k
}

// DataPrefix creates a new prefix for data attribute.
func DataPrefix(namespace, predicate []byte) []byte {
	k, _ := makeKeyBuf(namespace, PrefixDefault, KeyTypeData, predicate, 0)
	return k
}

// Index key creates a new key for indexed attribute.
func IndexKey(namespace, predicate, term []byte) []byte {
	k, pos := makeKeyBuf(namespace, PrefixDefault, KeyTypeIndex, predicate, len(term))
	copy(k[pos:], term)
	return k
}

// Index prefix creates a prefix for indexed values of the given predicate.
func IndexPrefix(namespace, predicate []byte) []byte {
	k, _ := makeKeyBuf(namespace, PrefixDefault, KeyTypeIndex, predicate, 0)
	return k
}

// ParseKey parses our key structure.
func ParseKey(namespace, k []byte) (ParsedKey, error) {
	var pk ParsedKey
	if !bytes.HasPrefix(k, namespace) {
		return pk, fmt.Errorf("invalid namespace for key")
	}

	pos := len(namespace)
	pk.Prefix = k[pos]

	if pk.Prefix != PrefixDefault {
		return pk, fmt.Errorf("invalid key prefix %v", pk.Prefix)
	}

	pos++
	pk.KeyType = k[pos]
	pos++
	plen := int(binary.BigEndian.Uint16(k[pos:]))
	pos += 2
	pk.Predicate = k[pos : pos+plen]
	pos += plen

	switch pk.KeyType {
	case KeyTypeData:
		pk.UID = binary.BigEndian.Uint64(k[pos:])
	case KeyTypeIndex:
		pk.Term = k[pos:]
	default:
		return pk, fmt.Errorf("invalid key type %v", pk.KeyType)
	}

	return pk, nil
}

// ParsedKey represents parsed key of the database.
type ParsedKey struct {
	Prefix    byte
	KeyType   byte
	Predicate []byte

	// UID is present in data key types.
	UID uint64

	// Term is present in index key types.
	Term []byte
}

// PredicateWithUID makes a compound predicate with uid.
func PredicateWithUID(pred []byte, uid uint64) []byte {
	k := make([]byte, len(pred)+8)
	n := copy(k, pred)
	binary.BigEndian.PutUint64(k[n:], uid)
	return k
}

func makeKeyBuf(namespace []byte, prefix, keyType byte, predicate []byte, extra int) ([]byte, int) {
	lp := len(predicate)
	if lp > math.MaxUint16 {
		panic("predicate is too long")
	}
	k := make([]byte, len(namespace)+1+1+2+lp+extra) // prefix + keyType + predicate size + predicate + extra space
	var pos int
	pos += copy(k, namespace)
	k[pos] = prefix
	pos++
	k[pos] = keyType
	pos++
	binary.BigEndian.PutUint16(k[pos:], uint16(lp))
	pos += 2
	pos += copy(k[pos:], predicate)
	return k, pos
}
