package backend

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs/sqlitebs"
	"mintter/backend/testutil"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestPatchStore_LoadEmpty(t *testing.T) {
	nowFunc = func() func() time.Time {
		return func() time.Time {
			var t time.Time
			return t.Add(1 * time.Second)
		}
	}()

	alice := makeTestPatchStore(t, "alice")
	ctx := context.Background()
	obj := testutil.MakeCID(t, "obj-1")

	s, err := alice.LoadState(ctx, obj)
	require.NoError(t, err)
	require.NotNil(t, s)
	require.True(t, s.IsEmpty())
}

// func TestPatchStore_AddPatch(t *testing.T) {
// 	nowFunc = func() func() time.Time {
// 		return func() time.Time {
// 			var t time.Time
// 			return t.Add(1 * time.Second)
// 		}
// 	}()

// 	alice := makeTestPatchStore(t, "alice")
// 	oid := testutil.MakeCID(t, "obj-1")
// 	kind := PatchKind("test-patch")
// 	ctx := context.Background()

// 	s := newChangeset(oid, nil)
// 	p1 := mustNewPatch(s.NewPatch(cid.Cid(alice.Tester.Account.CID()), alice.Tester.Device, kind, []byte("p-1")))
// 	p2 := mustNewPatch(s.NewPatch(cid.Cid(alice.Tester.Account.CID()), alice.Tester.Device, kind, []byte("p-2")))

// 	require.NoError(t, alice.AddPatch(ctx, p1))
// 	require.NoError(t, alice.AddPatch(ctx, p2))

// 	loaded, err := alice.LoadState(ctx, oid)
// 	require.NoError(t, err)

// 	list := loaded.Merge()
// 	require.Len(t, list, 2)
// }

// func TestPatchStore_AddPatchLoadState(t *testing.T) {
// 	nowFunc = func() func() time.Time {
// 		return func() time.Time {
// 			var t time.Time
// 			return t.Add(1 * time.Second)
// 		}
// 	}()

// 	alice := makeTestPatchStore(t, "alice")
// 	oid := testutil.MakeCID(t, "obj-1")
// 	kind := PatchKind("test-patch")
// 	ctx := context.Background()

// 	as := newChangeset(oid, nil)
// 	ap := []signedPatch{
// 		mustNewPatch(as.NewPatch(cid.Cid(alice.Tester.Account.CID()), alice.Tester.Device, kind, []byte("alice-patch-1"))),
// 		mustNewPatch(as.NewPatch(cid.Cid(alice.Tester.Account.CID()), alice.Tester.Device, kind, []byte("alice-patch-2"))),
// 		mustNewPatch(as.NewPatch(cid.Cid(alice.Tester.Account.CID()), alice.Tester.Device, kind, []byte("alice-patch-3"))),
// 	}

// 	require.NoError(t, alice.AddPatch(ctx, ap[0]))
// 	require.Error(t, alice.AddPatch(ctx, ap[0]), "must fail storing the same patch twice")
// 	require.Error(t, alice.AddPatch(ctx, ap[2]), "must fail storing patch with broken seq")
// 	require.NoError(t, alice.AddPatch(ctx, ap[1]))
// 	require.NoError(t, alice.AddPatch(ctx, ap[2]))

// 	bob := makeTester(t, "bob")
// 	bs := newChangeset(oid, nil)

// 	bp := []signedPatch{
// 		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-1"))),
// 		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-2"))),
// 		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-3"))),
// 	}
// 	for _, p := range bp {
// 		require.NoError(t, alice.AddPatch(ctx, p), "failed to add "+string(p.Body))
// 	}

// 	ss, err := alice.LoadState(ctx, oid)
// 	require.NoError(t, err)
// 	require.Equal(t, 6, ss.size)
// 	require.Equal(t, ap, ss.byPeer[0])
// 	require.Equal(t, bp, ss.byPeer[1])
// }

// TODO: add this replicate missing test.

// func TestPatchStore_ReplicateMissing(t *testing.T) {
// 	alice := makeTestPatchStore(t, "alice")
// 	bob := makeTestPatchStore(t, "bob")

// 	ap := [...]signedPatch{
// 		alice.makeTestPatch(t, "obj-1", "alice-account", "P1"),
// 		alice.makeTestPatch(t, "obj-1", "alice-account", "P2"),
// 		alice.makeTestPatch(t, "obj-1", "alice-account", "P3"),
// 		alice.makeTestPatch(t, "obj-1", "alice-account", "P4"),
// 	}

// 	err := bob.replicate(ap[0])
// 	require.NoError(t, err, "bob must replicate first patch from alice")

// 	// We simulate that bob will be able to fetch the dependencies from the network.
// 	bob.exchange = alice.bs

// 	// Now let's assume bob went offline, and when he comes back he replicates the last patch from Alice
// 	// with some patches missing in between.

// 	err = bob.replicate(ap[3])
// 	// require.Error(t, err, "must fail saving patch with missing dependencies")
// 	require.NoError(t, err, "must not fail to save patch with missing dependencies")

// 	aliceInBob := bob.patches[ap[0].ObjectID][ap[0].peer]
// 	require.Equal(t, len(ap), len(aliceInBob), "bob must have the same number of patches as alice after resolving")

// 	for i, item := range aliceInBob {
// 		require.Equal(t, ap[i].Seq, item.Seq)
// 		require.Equal(t, ap[i].LamportTime, item.LamportTime)
// 		require.Equal(t, ap[i].cid, item.CID)
// 	}
// }

type testPS interface {
	AddPatch(ctx context.Context, sps ...signedPatch) error
	LoadState(ctx context.Context, obj cid.Cid) (*changeset, error)
}

type testPatchStore struct {
	testPS
	Tester Tester
}

func makeTestPatchStore(t *testing.T, name string) *testPatchStore {
	dir := testutil.MakeRepoPath(t)

	pool, err := sqliteschema.Open(filepath.Join(dir, "db.sqlite"), 0, 10)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})

	conn, release, err := pool.Conn(context.Background())
	require.NoError(t, err)
	defer release()

	require.NoError(t, sqliteschema.Migrate(conn))

	bs := sqlitebs.New(pool, sqlitebs.DefaultConfig())

	store, err := newSQLitePatchStore(pool, bs)
	require.NoError(t, err)

	return &testPatchStore{
		testPS: store,
		Tester: makeTester(t, name),
	}
}
