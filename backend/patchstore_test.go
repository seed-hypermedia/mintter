package backend

import (
	"context"
	"mintter/backend/badgerutil"
	"mintter/backend/testutil"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/stretchr/testify/require"
)

func init() {
	nowFunc = func() func() time.Time {
		return func() time.Time {
			var t time.Time
			return t.Add(1 * time.Second)
		}
	}()
}

func TestPatchStore_LoadEmpty(t *testing.T) {
	alice := makeTestPatchStore(t, "alice")
	ctx := context.Background()
	obj := testutil.MakeCID(t, "obj-1")

	s, err := alice.LoadState(ctx, obj)
	require.NoError(t, err)
	require.NotNil(t, s)
	require.True(t, s.IsEmpty())
}

func TestPatchStore_AddPatchLoadState(t *testing.T) {
	alice := makeTestPatchStore(t, "alice")
	oid := testutil.MakeCID(t, "obj-1")
	kind := PatchKind("test-patch")
	ctx := context.Background()

	as := newState(oid, nil)
	ap := []signedPatch{
		mustNewPatch(as.NewPatch(alice.peer, alice.k, kind, []byte("alice-patch-1"))),
		mustNewPatch(as.NewPatch(alice.peer, alice.k, kind, []byte("alice-patch-2"))),
		mustNewPatch(as.NewPatch(alice.peer, alice.k, kind, []byte("alice-patch-3"))),
	}

	require.NoError(t, alice.AddPatch(ctx, ap[0]))
	require.Error(t, alice.AddPatch(ctx, ap[0]), "must fail storing the same patch twice")
	require.Error(t, alice.AddPatch(ctx, ap[2]), "must fail storing patch with broken seq")
	require.NoError(t, alice.AddPatch(ctx, ap[1]))
	require.NoError(t, alice.AddPatch(ctx, ap[2]))

	bob := makeTester(t, "bob")
	bs := newState(oid, nil)

	bp := []signedPatch{
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.id), bob.Device.priv, kind, []byte("bob-patch-1"))),
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.id), bob.Device.priv, kind, []byte("bob-patch-2"))),
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.id), bob.Device.priv, kind, []byte("bob-patch-3"))),
	}
	for _, p := range bp {
		require.NoError(t, alice.AddPatch(ctx, p), "failed to add "+string(p.Body))
	}

	ss, err := alice.LoadState(ctx, oid)
	require.NoError(t, err)
	require.Equal(t, ap, ss.byPeer[0])
	require.Equal(t, bp, ss.byPeer[1])
}

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

func makeTestPatchStore(t *testing.T, name string) *patchStore {
	t.Helper()

	ds := testutil.MakeDatastore(t)
	bs := blockstore.NewBlockstore(ds)

	key := testutil.MakeProfile(t, name).Peer.PrivKey.PrivKey

	db, err := badgerutil.NewDB(testutil.MakeBadgerV3(t), "!mtttest")
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, db.Close())
	})

	store, err := newPatchStore(key, bs, db)
	require.NoError(t, err)

	return store
}
