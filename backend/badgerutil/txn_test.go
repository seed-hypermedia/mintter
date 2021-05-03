package badgerutil

import (
	"fmt"
	"mintter/backend/testutil"
	"testing"

	"github.com/dgraph-io/badger/v3"
	"github.com/stretchr/testify/require"
)

func TestTxnUID(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	// We allocate id for a new node.
	err = db.Update(func(txn *Txn) error {
		uid, err := txn.UID("User", []byte("foo"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), uid)
		return nil
	})
	require.NoError(t, err)

	// We read allocated uid using write txn.
	err = db.Update(func(txn *Txn) error {
		uid, err := txn.UID("User", []byte("foo"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), uid)
		return nil
	})
	require.NoError(t, err)

	// Allocate another uid for a new node.
	err = db.Update(func(txn *Txn) error {
		uid, err := txn.UID("User", []byte("bar"))
		require.NoError(t, err)
		require.Equal(t, uint64(2), uid)
		return nil
	})
	require.NoError(t, err)

	// Read it again.
	err = db.Update(func(txn *Txn) error {
		uid, err := txn.UID("User", []byte("bar"))
		require.NoError(t, err)
		require.Equal(t, uint64(2), uid)
		return nil
	})
	require.NoError(t, err)

	// Check that read-only fails for missing nodes.
	err = db.View(func(txn *Txn) error {
		_, err := txn.UIDRead("User", []byte("missing"))
		return err
	})
	require.Error(t, err)

	// Check that read-only works with existing ones.
	err = db.View(func(txn *Txn) error {
		uid, err := txn.UIDRead("User", []byte("bar"))
		require.NoError(t, err)
		require.Equal(t, uint64(2), uid)
		return nil
	})
	require.NoError(t, err)

	// Test getting nodes of a type.
	err = db.View(func(txn *Txn) error {
		want := []uint64{1, 2}
		return txn.ScanIndex("$type", []byte("User"), func(i int, uid uint64) error {
			require.Equal(t, want[i], uid)
			return nil
		})
	})
	require.NoError(t, err, "must list nodes of a type")

	err = db.View(func(txn *Txn) error {
		return txn.ScanIndex("$type", []byte("FakeType"), func(i int, uid uint64) error {
			return fmt.Errorf("fake-type-must-not-call-callback")
		})
	})
	require.Equal(t, badger.ErrKeyNotFound, err, "scanning missing index must return not found error")

	// Test getting type of a node.
	err = db.View(func(txn *Txn) error {
		v, err := txn.GetPredicate(1, "$type")
		require.NoError(t, err)
		require.Equal(t, "User", v)

		v, err = txn.GetPredicate(2, "$type")
		require.NoError(t, err)
		require.Equal(t, "User", v)

		v, err = txn.GetPredicate(3, "$type")
		require.Nil(t, v)
		require.Equal(t, badger.ErrKeyNotFound, err)
		return nil
	})
	require.NoError(t, err)
}

func TestMultipleRelations(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	var auid, buid, cuid uint64
	err = db.Update(func(txn *Txn) error {
		var err error
		auid, err = txn.UID("User", []byte("alice"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), auid)

		buid, err = txn.UID("User", []byte("bob"))
		require.NoError(t, err)
		require.Equal(t, uint64(2), buid)

		cuid, err = txn.UID("User", []byte("carol"))
		require.NoError(t, err)
		require.Equal(t, uint64(3), cuid)

		require.NoError(t, txn.AddPredicate(auid, "follows", buid, valueUID))
		require.NoError(t, txn.AddPredicate(auid, "follows", cuid, valueUID))
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		v, err := txn.GetPredicate(auid, "follows")
		require.Nil(t, v)
		require.Equal(t, badger.ErrKeyNotFound, err, "must fail to get multi predicate as uniq")

		want := []uint64{buid, cuid}
		return txn.ScanPredicate(auid, "follows", func(i int, v interface{}) error {
			require.Equal(t, want[i], v)
			return nil
		})
	})
	require.NoError(t, err)
}
