package badgerutil

import (
	"encoding/binary"
	"fmt"
	"math"
)

const (
	PrefixDefault  byte = 0x00
	PrefixInternal byte = 0x02

	KeyTypeData    byte = 0x00
	KeyTypeIndex   byte = 0x02
	KeyTypeReverse byte = 0x04
)

type parsedKey struct {
	Namespace   string
	Predicate   string
	Subject     uint64
	KeyType     byte
	Token       []byte // only present when key type is index.
	Object      uint64 // only present when key type is reverse.
	Cardinality uint64 // only present when key type is data.
}

func parseKey(namespace string, key []byte) (parsedKey, error) {
	var pk parsedKey

	if len(key) <= len(namespace) {
		return pk, fmt.Errorf("key is too short")
	}

	var pos int
	pos = len(namespace)
	pk.Namespace = string(key[:pos])
	if namespace != pk.Namespace {
		return pk, fmt.Errorf("invalid namespace for key: want = %s got = %s", namespace, pk.Namespace)
	}
	prefix := key[pos]
	pos++

	if prefix != PrefixDefault {
		return pk, fmt.Errorf("invalid key prefix %v", prefix)
	}

	plen := int(binary.BigEndian.Uint16(key[pos:]))
	pos += 2
	pk.Predicate = string(key[pos : pos+plen])
	pos += plen

	pk.KeyType = key[pos]
	pos++

	switch pk.KeyType {
	case KeyTypeData:
		pk.Subject = binary.BigEndian.Uint64(key[pos:])
		pos += 8
		if pk.Subject == 0 {
			return pk, fmt.Errorf("invalid key subject")
		}

		pk.Cardinality = binary.BigEndian.Uint64(key[pos:])
		pos += 8

		if pk.Cardinality == 0 {
			return pk, fmt.Errorf("invalid ts value in key: %d", pk.Cardinality)
		}
	case KeyTypeIndex:
		tlen := int(binary.BigEndian.Uint16(key[pos:]))
		pos += 2
		pk.Token = key[pos : pos+tlen]
		pos += tlen
		pk.Subject = binary.BigEndian.Uint64(key[pos:])
		pos += 8
		if pk.Subject == 0 {
			return pk, fmt.Errorf("invalid key subject")
		}
	case KeyTypeReverse:
		pk.Object = binary.BigEndian.Uint64(key[pos:])
		pos += 8
		if pk.Object == 0 {
			return pk, fmt.Errorf("invalid key object")
		}
		pk.Subject = binary.BigEndian.Uint64(key[pos:])
		pos += 8
		if pk.Subject == 0 {
			return pk, fmt.Errorf("invalid key subject")
		}
	default:
		return pk, fmt.Errorf("invalid key type %v", pk.KeyType)
	}

	return pk, nil
}

func indexKey(namespace, predicate string, token []byte, subject uint64) []byte {
	l := len(token)
	if l > math.MaxUint16 {
		panic("token is too long")
	}
	tlen := uint16(l)
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeIndex, predicate, 2+l+8) // token size + token + subject
	binary.BigEndian.PutUint16(k[pos:], tlen)
	pos += 2
	pos += copy(k[pos:], token)
	binary.BigEndian.PutUint64(k[pos:], subject)
	return k
}

func indexPrefix(namespace, predicate string, token []byte) []byte {
	l := len(token)
	if l > math.MaxUint16 {
		panic("token is too long")
	}
	tlen := uint16(l)
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeIndex, predicate, 2+l) // token size + token
	binary.BigEndian.PutUint16(k[pos:], tlen)
	pos += 2
	copy(k[pos:], token)
	return k
}

func dataKey(namespace, predicate string, uid, cardinality uint64) []byte {
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeData, predicate, 8+8) // subject + cardinality
	binary.BigEndian.PutUint64(k[pos:], uid)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], cardinality)
	return k
}

func dataPrefix(namespace, predicate string) []byte {
	k, _ := makeKey(namespace, PrefixDefault, KeyTypeData, predicate, 0)
	return k
}

func dataPrefixSubject(namespace, predicate string, subject uint64) []byte {
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeData, predicate, 8) // subject + ts + idx.
	binary.BigEndian.PutUint64(k[pos:], subject)
	return k
}

func reverseKey(namespace, predicate string, object, subject uint64) []byte {
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeReverse, predicate, 8+8) // object, subject
	binary.BigEndian.PutUint64(k[pos:], object)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], subject)
	return k
}

func reversePrefix(namespace, predicate string, object uint64) []byte {
	k, pos := makeKey(namespace, PrefixDefault, KeyTypeReverse, predicate, 8)
	binary.BigEndian.PutUint64(k[pos:], object)
	return k
}

func makeKey(namespace string, prefix, keyType byte, predicate string, extra int) ([]byte, int) {
	lp := len(predicate)
	if lp > math.MaxUint16 {
		panic("predicate is too long")
	}
	k := make([]byte, len(namespace)+1+1+2+lp+extra) // prefix + predicate size + predicate + keyType+ extra space
	var pos int
	pos += copy(k, namespace)
	k[pos] = prefix
	pos++
	binary.BigEndian.PutUint16(k[pos:], uint16(lp))
	pos += 2
	pos += copy(k[pos:], predicate)
	k[pos] = keyType
	pos++
	return k, pos
}
