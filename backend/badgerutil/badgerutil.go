package badgerutil

import (
	"encoding/binary"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/proto"
)

// GetUint64 reads value of k using txn and decodes it as uint64.
func GetUint64(txn *badger.Txn, k []byte) (uint64, error) {
	item, err := txn.Get(k)
	if err != nil {
		return 0, err
	}

	return Uint64Item(item)
}

// GetCID reads value of k using txn and decodes it as a CID.
func GetCID(txn *badger.Txn, k []byte) (cid.Cid, error) {
	item, err := txn.Get(k)
	if err != nil {
		return cid.Undef, err
	}

	return CIDItem(item)
}

// Uint64Item is the same as GetUint64 but using a retrieved item.
func Uint64Item(item *badger.Item) (uint64, error) {
	var n uint64
	if err := item.Value(func(data []byte) error {
		n = binary.BigEndian.Uint64(data)

		return nil
	}); err != nil {
		return 0, err
	}

	return n, nil
}

// Uint64Item is the same as GetCID but using a retrieved item.
func CIDItem(item *badger.Item) (cid.Cid, error) {
	var id cid.Cid
	if err := item.Value(func(data []byte) error {
		v, err := cid.Cast(data)
		if err != nil {
			return err
		}

		id = v

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	return id, nil
}

// SetUint64 sets the uint64 value on k using txn.
func SetUint64(txn *badger.Txn, k []byte, v uint64) error {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, v)
	return txn.Set(k, buf)
}

// SetCID sets the CID value on k using txn.
func SetCID(txn *badger.Txn, k []byte, v cid.Cid) error {
	data := v.Bytes()
	return txn.Set(k, data)
}

// DecodeProto can be used to conveniently read protobuf-encoded Badger value.
func DecodeProto(m proto.Message) func([]byte) error {
	return func(val []byte) error {
		return proto.Unmarshal(val, m)
	}
}
