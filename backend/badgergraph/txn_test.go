package badgergraph

import (
	"testing"

	"mintter/backend/testutil"

	"github.com/dgraph-io/badger/v3"
	"github.com/stretchr/testify/require"
	"go.uber.org/multierr"
)

const testNS = "mtt-test"

func TestSetGetProperty(t *testing.T) {
	// db, err := NewDB(testutil.MakeBadgerV3(t), testNS)
	// require.NoError(t, err)
	// defer func() {
	// 	require.NoError(t, db.Close())
	// }()

	// tests := []struct {
	// 	XID     []byte
	// 	Preds   map[string]interface{}
	// 	WantUID uint64
	// }{
	// 	{
	// 		XID: []byte("alice"),
	// 		Preds: map[string]interface{}{
	// 			"Person/name":  "Alice",
	// 			"Person/email": "alice@example.com",
	// 		},
	// 		WantUID: 1,
	// 	},
	// }

	// err = db.Update(func(txn *Txn) error {
	// 	for _, tt := range tests {
	// 		uid, err := txn.UID("Person", tt.XID)
	// 		require.NoError(t, err)

	// 		for k, v := range tt.Preds {
	// 			require.NoError(t, txn.SetProperty(uid, k, v, false))
	// 		}
	// 	}
	// 	return nil
	// })
	// require.NoError(t, err)

	// err = db.View(func(txn *Txn) error {
	// 	for _, tt := range tests {
	// 		for k, v := range tt.Preds {
	// 			vv, err := txn.GetProperty(tt.WantUID, k)
	// 			require.NoError(t, err)
	// 			require.Equal(t, v, vv)
	// 		}
	// 	}
	// 	return nil
	// })
	// require.NoError(t, err)

	// err = db.View(func(txn *Txn) error {
	// 	for _, tt := range tests {
	// 		for k, v := range tt.Preds {
	// 			vv, err := txn.GetProperty(tt.WantUID, k)
	// 			require.NoError(t, err)
	// 			require.Equal(t, v, vv)
	// 		}
	// 	}
	// 	return nil
	// })
	// require.NoError(t, err)
}

func TestListIndexedNodes(t *testing.T) {
	schema := NewSchema()
	schema.RegisterType("Person")

	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
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
		nodes, err := txn.ListIndexedNodes(schema.schema["Person"][nodeTypePredicate].FullName(), []byte("Person"))
		require.NoError(t, err)
		require.Equal(t, []uint64{1, 2, 3}, nodes)
		return nil
	})
	require.NoError(t, err)
}

func TestUID(t *testing.T) {
	schema := NewSchema()
	schema.RegisterType("User")
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
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
	schema := NewSchema()
	schema.RegisterType("User")
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
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
	schema := NewSchema()
	schema.RegisterType("Person")
	schema.RegisterType("Peer")
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
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
		v, err := txn.GetProperty(1, schema.schema["Person"][nodeTypePredicate].FullName())
		require.NoError(t, err)
		require.Equal(t, "Person", v)

		v, err = txn.GetProperty(2, schema.schema["Peer"][nodeTypePredicate].FullName())
		require.NoError(t, err)
		require.Equal(t, "Peer", v)
		return nil
	})
	require.NoError(t, err)
}

func TestRelations(t *testing.T) {
	schema := NewSchema()
	personFollows := schema.RegisterPredicate("Person", Predicate{
		Name:     "follows",
		IsList:   true,
		HasIndex: true,
		Type:     ValueTypeUID,
	})
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
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
			txn.WriteTriple(alice, personFollows, bob),
			txn.WriteTriple(bob, personFollows, carol),
			txn.WriteTriple(alice, personFollows, carol),
		)
	})
	require.NoError(t, err)

	err = db.View(func(txn *Txn) error {
		following, err := txn.ListRelations(alice, personFollows.FullName())
		require.NoError(t, err)
		require.Equal(t, []uint64{bob, carol}, following)

		followers, err := txn.ListReverseRelations(personFollows.FullName(), carol)
		require.NoError(t, err)
		require.Equal(t, []uint64{alice, bob}, followers)
		return nil
	})
	require.NoError(t, err)
}
