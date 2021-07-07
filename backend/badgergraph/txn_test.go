package badgergraph

import (
	"errors"
	"testing"

	"mintter/backend/testutil"

	"github.com/dgraph-io/badger/v3"
	"github.com/stretchr/testify/require"
	"go.uber.org/multierr"
)

const testNS = "mtt-test"

func TestPreallocateUIDs(t *testing.T) {
	schema := NewSchema()
	schema.RegisterType("Person")

	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	concurrency := 32
	type result struct {
		idx  int
		err  error
		uids []uint64
	}

	out := make(chan result, concurrency)
	for i := 0; i < concurrency; i++ {
		go func(i int) {
			var res result
			res.uids, res.err = db.PreallocateUIDs(
				XID{NodeType: "Person", ID: []byte("alice")},
				XID{NodeType: "Person", ID: []byte("bob")},
				XID{NodeType: "Person", ID: []byte("carol")},
			)
			res.idx = i
			out <- res
		}(i)
	}

	var wantUIDs []uint64
	for i := 0; i < concurrency; i++ {
		res := <-out
		if i == 0 {
			wantUIDs = res.uids
		}
		require.NoError(t, res.err)
		require.Equal(t, wantUIDs, res.uids)
	}
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
		nodes, err := txn.ListIndexedNodes(schema.schema["Person"][predicateNodeType], []byte("Person"))
		require.NoError(t, err)
		require.Equal(t, []uint64{1, 2, 3}, nodes)
		return nil
	})
	require.NoError(t, err)
}

func TestUIDConcurrent(t *testing.T) {
	schema := NewSchema()
	schema.RegisterType("Peer")
	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	concurrency := 15

	type result struct {
		err error
		uid uint64
		idx int
	}

	done := make(chan result, concurrency)

	for i := 0; i < concurrency; i++ {
		go func(i int) {
		start:
			var res result
			err := db.Update(func(txn *Txn) error {
				uid, err := txn.UID("Peer", []byte("peer-id"))
				res.uid = uid
				return err
			})
			if errors.Is(err, badger.ErrConflict) {
				goto start
			}
			res.err = err
			res.idx = i
			done <- res
		}(i)
	}

	// All concurrent request must return the same UID. It may not be 1
	// depending on which goroutine successfully commits the transaction first.
	var uid uint64
	for i := 0; i < concurrency; i++ {
		res := <-done
		if i == 0 {
			uid = res.uid
		}
		require.NoErrorf(t, res.err, "failed to allocate UID: worker %d", res.idx+1)
		require.Equal(t, uid, res.uid, "allocated uid didn't reuse the value")
	}
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
		v, err := txn.GetPropertyString(1, schema.schema["Person"][predicateNodeType])
		require.NoError(t, err)
		require.Equal(t, "Person", v)

		v, err = txn.GetPropertyString(2, schema.schema["Peer"][predicateNodeType])
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
		following, err := txn.ListRelations(alice, personFollows)
		require.NoError(t, err)
		require.Equal(t, []uint64{bob, carol}, following)

		followers, err := txn.ListReverseRelations(personFollows, carol)
		require.NoError(t, err)
		require.Equal(t, []uint64{alice, bob}, followers)
		return nil
	})
	require.NoError(t, err)
}

func TestDeleteNode(t *testing.T) {
	schema := NewSchema()
	follows := schema.RegisterPredicate("Person", Predicate{
		Name:   "follows",
		IsList: true,
		// HasIndex: true,
		Type: ValueTypeUID,
	})
	name := schema.RegisterPredicate("Person", Predicate{
		Name:     "name",
		HasIndex: true,
		Type:     ValueTypeString,
	})

	db, err := NewDB(testutil.MakeBadgerV3(t), testNS, schema)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, db.Close())
	}()

	keyCountInitial := countBadgerKeys(t, db.Badger)

	alice := []byte("alice")
	bob := []byte("bob")
	carol := []byte("carol")

	err = db.Update(func(txn *Txn) error {
		auid, err := txn.UID("Person", alice)
		require.NoError(t, err)

		buid, err := txn.UID("Person", bob)
		require.NoError(t, err)

		cuid, err := txn.UID("Person", carol)
		require.NoError(t, err)

		require.NoError(t, txn.WriteTriple(auid, follows, buid))
		require.NoError(t, txn.WriteTriple(buid, follows, cuid))
		require.NoError(t, txn.WriteTriple(auid, name, "Alice"))
		require.NoError(t, txn.WriteTriple(buid, name, "Bob"))
		require.NoError(t, txn.WriteTriple(cuid, name, "Carol"))
		return nil
	})
	require.NoError(t, err)

	keyCountBeforeDelete := countBadgerKeys(t, db.Badger)
	require.True(t, keyCountInitial < keyCountBeforeDelete, "must write some keys")

	err = db.Update(func(txn *Txn) error {
		auid, err := txn.UIDRead("Person", alice)
		require.NoError(t, err)
		buid, err := txn.UIDRead("Person", bob)
		require.NoError(t, err)
		cuid, err := txn.UIDRead("Person", carol)
		require.NoError(t, err)

		require.NoError(t, txn.DeleteNode("Person", auid))
		require.NoError(t, txn.DeleteNode("Person", buid))
		require.NoError(t, txn.DeleteNode("Person", cuid))
		return nil
	})
	require.NoError(t, err)

	keyCountAfterDelete := countBadgerKeys(t, db.Badger)
	require.Equal(t, keyCountAfterDelete, keyCountInitial, "must delete all the written keys")
}

func countBadgerKeys(t *testing.T, db *badger.DB) int {
	var count int
	err := db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.PrefetchValues = false
		it := txn.NewIterator(opts)
		defer it.Close()
		for it.Rewind(); it.Valid(); it.Next() {
			count++
		}
		return nil
	})
	require.NoError(t, err)
	return count
}
