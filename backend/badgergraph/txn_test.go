package badgergraph

import (
	"mintter/backend/testutil"
	"testing"

	"github.com/dgraph-io/badger/v3"
	"github.com/stretchr/testify/require"
	"go.uber.org/multierr"
)

const testNS = "mtt-test"

func TestSetGetProperty(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	tests := []struct {
		XID     []byte
		Preds   map[string]interface{}
		WantUID uint64
	}{
		{
			XID: []byte("alice"),
			Preds: map[string]interface{}{
				"Person/name":  "Alice",
				"Person/email": "alice@example.com",
			},
			WantUID: 1,
		},
	}

	err = db.Update(func(txn *Txn) error {
		for _, tt := range tests {
			uid, err := txn.UID("Person", tt.XID)
			require.NoError(t, err)

			for k, v := range tt.Preds {
				require.NoError(t, txn.SetProperty(uid, k, v, false))
			}
		}
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		for _, tt := range tests {
			for k, v := range tt.Preds {
				vv, err := txn.GetProperty(tt.WantUID, k)
				require.NoError(t, err)
				require.Equal(t, v, vv)
			}
		}
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		for _, tt := range tests {
			for k, v := range tt.Preds {
				vv, err := txn.GetProperty(tt.WantUID, k)
				require.NoError(t, err)
				require.Equal(t, v, vv)
			}
		}
		return nil
	})
	require.NoError(t, err)
}

func TestListIndexedNodes(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	err = db.Update(func(txn *Txn) error {
		_, err := txn.UID("Person", []byte("alice"))
		require.NoError(t, err)

		_, err = txn.UID("Person", []byte("bob"))
		require.NoError(t, err)

		_, err = txn.UID("Person", []byte("carol"))
		require.NoError(t, err)

		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		nodes, err := txn.ListIndexedNodes(PredicateNodeType, []byte("Person"))
		require.NoError(t, err)
		require.Equal(t, []uint64{1, 2, 3}, nodes)
		return nil
	})
	require.NoError(t, err)
}

func TestUID(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	names := []string{"alice", "bob", "carol"}

	// Allocate UIDs.
	err = db.Update(func(txn *Txn) error {
		for i, n := range names {
			uid, err := txn.UID("User", []byte(n))
			require.NoError(t, err)
			require.Equal(t, uint64(i+1), uid, n)
		}
		return nil
	})
	require.NoError(t, err, "failed allocating uids")

	// Read back same UIDs.
	err = db.View(func(txn *Txn) error {
		for i, n := range names {
			uid, err := txn.UID("User", []byte(n))
			require.NoError(t, err)
			require.Equal(t, uint64(i+1), uid, n)
		}
		return nil
	})
	require.NoError(t, err, "failed reading uids")

	// Read back XIDs.
	err = db.View(func(txn *Txn) error {
		for i, n := range names {
			name, err := txn.XID("User", uint64(i+1))
			require.NoError(t, err, "failed reading xid "+n)
			require.Equal(t, n, string(name), n)
		}
		return nil
	})
	require.NoError(t, err, "failed reading xids")
}

func TestUIDRead(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	err = db.Update(func(txn *Txn) error {
		_, err := txn.UID("User", []byte("alice"))
		return err
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		alice, err := txn.UID("User", []byte("alice"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), alice)

		_, err = txn.UID("User", []byte("missing"))
		require.Equal(t, badger.ErrKeyNotFound, err, "must fail to read missing uids")
		return nil
	})
	require.NoError(t, err)
}

func TestNodeType(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	err = db.Update(func(txn *Txn) error {
		_, err := txn.UID("Person", []byte("alice"))
		require.NoError(t, err)

		_, err = txn.UID("Peer", []byte("alice"))
		require.NoError(t, err)
		return nil
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		v, err := txn.GetProperty(1, PredicateNodeType)
		require.NoError(t, err)
		require.Equal(t, "Person", v)

		v, err = txn.GetProperty(2, PredicateNodeType)
		require.NoError(t, err)
		require.Equal(t, "Peer", v)
		return nil
	})
	require.NoError(t, err)
}

func TestRelations(t *testing.T) {
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	var alice, bob, carol uint64
	err = db.Update(func(txn *Txn) error {
		var err error
		alice, err = txn.UID("Person", []byte("alice"))
		require.NoError(t, err)
		require.Equal(t, uint64(1), alice)

		bob, err = txn.UID("Person", []byte("bob"))
		require.NoError(t, err)
		require.Equal(t, uint64(2), bob)

		carol, err = txn.UID("Person", []byte("carol"))
		require.NoError(t, err)
		require.Equal(t, uint64(3), carol)

		return multierr.Combine(
			txn.AddRelation(alice, "follows", bob, true),
			txn.AddRelation(bob, "follows", carol, true),
			txn.AddRelation(alice, "follows", carol, true),
		)
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		following, err := txn.ListRelations(alice, "follows")
		require.NoError(t, err)
		require.Equal(t, []uint64{bob, carol}, following)

		followers, err := txn.ListReverseRelations("follows", carol)
		require.NoError(t, err)
		require.Equal(t, []uint64{alice, bob}, followers)
		return nil
	})
	require.NoError(t, err)
}

// func TestMultipleRelations(t *testing.T) {
// 	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
// 	require.NoError(t, err)
// 	defer func() {
// 		require.NoError(t, db.Close())
// 	}()

// 	var auid, buid, cuid uint64
// 	err = db.Update(func(txn *Txn) error {
// 		var err error
// 		auid, err = txn.UID("User", []byte("alice"))
// 		require.NoError(t, err)
// 		require.Equal(t, uint64(1), auid)

// 		buid, err = txn.UID("User", []byte("bob"))
// 		require.NoError(t, err)
// 		require.Equal(t, uint64(2), buid)

// 		cuid, err = txn.UID("User", []byte("carol"))
// 		require.NoError(t, err)
// 		require.Equal(t, uint64(3), cuid)

// 		require.NoError(t, txn.AddPredicate(auid, "follows", buid, ValueTypeUID))
// 		require.NoError(t, txn.AddPredicate(auid, "follows", cuid, ValueTypeUID))
// 		return nil
// 	})
// 	require.NoError(t, err)

// 	err = db.View(func(txn *Txn) error {
// 		v, err := txn.GetPredicate(auid, "follows")
// 		require.Nil(t, v)
// 		require.Equal(t, badger.ErrKeyNotFound, err, "must fail to get multi predicate as uniq")

// 		want := []uint64{buid, cuid}
// 		return txn.ScanPredicate(auid, "follows", func(i int, v interface{}) error {
// 			require.Equal(t, want[i], v)
// 			return nil
// 		})
// 	})
// 	require.NoError(t, err)
// }

// func TestReversePredicatesUnique(t *testing.T) {
// 	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
// 	require.NoError(t, err)
// 	defer func() {
// 		require.NoError(t, db.Close())
// 	}()

// 	txn := db.NewTransaction(true)
// 	defer txn.Discard()

// 	alice, err := txn.UID("User", []byte("alice"))
// 	require.NoError(t, err)
// 	require.Equal(t, uint64(1), alice)

// 	bob, err := txn.UID("User", []byte("bob"))
// 	require.NoError(t, err)
// 	require.Equal(t, uint64(2), bob)

// 	err = txn.SetPredicateWithInverse(alice, "follows", bob, ValueTypeUID)
// 	require.NoError(t, err, "alice must follow bob")

// 	require.NoError(t, txn.Commit())

// 	err = db.View(func(txn *Txn) error {
// 		return txn.ScanReverseIndex("follows", bob, func(i int, subject, ts, idx uint64) error {
// 			require.Equal(t, alice, subject)
// 			require.Equal(t, uint64(0), ts)
// 			require.Equal(t, uint64(0), idx)

// 			name, err := txn.XID("User", subject)
// 			require.NoError(t, err)
// 			require.Equal(t, "alice", string(name))
// 			return nil
// 		})
// 	})
// 	require.NoError(t, err)
// }

// func TestReversePredicatesMulti(t *testing.T) {
// 	db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
// 	require.NoError(t, err)
// 	defer func() {
// 		require.NoError(t, db.Close())
// 	}()

// 	txn := db.NewTransaction(true)
// 	defer txn.Discard()

// 	alice, err := txn.UID("User", []byte("alice"))
// 	require.NoError(t, err)
// 	require.Equal(t, uint64(1), alice)

// 	bob, err := txn.UID("User", []byte("bob"))
// 	require.NoError(t, err)
// 	require.Equal(t, uint64(2), bob)

// 	carol, err := txn.UID("User", []byte("carol"))
// 	require.NoError(t, err)
// 	require.Equal(t, uint64(3), carol)

// 	err = txn.AddPredicateWithInverse(alice, "follows", bob, ValueTypeUID)
// 	require.NoError(t, err, "alice must follow bob")

// 	err = txn.AddPredicateWithInverse(carol, "follows", bob, ValueTypeUID)
// 	require.NoError(t, err, "carol must follow bob")

// 	require.NoError(t, txn.Commit())

// 	// Find who follows bob.
// 	want := map[uint64]string{
// 		alice: "alice",
// 		carol: "carol",
// 	}
// 	err = db.View(func(txn *Txn) error {
// 		n, err := txn.XID("User", alice)
// 		require.NoError(t, err)
// 		require.Equal(t, "alice", string(n))

// 		n, err = txn.XID("User", carol)
// 		require.NoError(t, err)
// 		require.Equal(t, "carol", string(n))

// 		return txn.ScanReverseIndex("follows", bob, func(i int, subject, ts, idx uint64) error {
// 			name, err := txn.XID("User", subject)
// 			require.NoError(t, err)
// 			require.Equal(t, want[subject], string(name), "names don't match")

// 			return nil
// 		})
// 	})
// 	require.NoError(t, err)
// }
