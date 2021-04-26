package badgerutil

import (
	"encoding/binary"
	"fmt"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
)

func GetUint64(txn *badger.Txn, k []byte) (uint64, error) {
	item, err := txn.Get(k)
	if err != nil {
		return 0, fmt.Errorf("failed to get key: %w", err)
	}

	return Uint64Item(item)
}

func GetCID(txn *badger.Txn, k []byte) (cid.Cid, error) {
	item, err := txn.Get(k)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get key: %w", err)
	}

	return CIDItem(item)
}

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

func SetUint64(txn *badger.Txn, k []byte, v uint64) error {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, v)
	return txn.Set(k, buf)
}

func SetCID(txn *badger.Txn, k []byte, v cid.Cid) error {
	data := v.Bytes()
	return txn.Set(k, data)
}
