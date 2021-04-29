package badgerutil

import (
	"mintter/backend/testutil"
	"testing"

	"github.com/dgraph-io/badger/v3"
	"github.com/stretchr/testify/require"
)

func TestUID(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	testKind := []byte("object")

	err = db.Update(func(txn *badger.Txn) error {
		uid, err := db.UID(txn, testKind, []byte("foo"))
		require.NoError(t, err)
		require.Equal(t, uint64(0), uid)
		return nil
	})
	require.NoError(t, err)

	err = db.Update(func(txn *badger.Txn) error {
		uid, err := db.UID(txn, testKind, []byte("bar"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), uid)
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *badger.Txn) error {
		uid, err := db.UID(txn, testKind, []byte("foo"))
		require.NoError(t, err)
		require.Equal(t, uint64(0), uid)
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *badger.Txn) error {
		uid, err := db.UID(txn, testKind, []byte("bar"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), uid)
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *badger.Txn) error {
		_, err := db.UID(txn, testKind, []byte("missing"))
		require.Error(t, err)
		return nil
	})
	require.NoError(t, err)
}
