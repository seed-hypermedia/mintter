package backend

import (
	"testing"

	"mintter/backend/testutil"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestPatchRDTState_NewPatch(t *testing.T) {
	alice := makeTester(t, "alice")
	obj := testutil.MakeCID(t, "document-1")
	kind := PatchKind("test-patch")

	s := newChangeset(obj, nil)

	ap1 := mustNewPatch(s.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-1")))
	require.True(t, ap1.Author.Equals(cid.Cid(alice.Account.CID())))
	require.Equal(t, uint64(1), ap1.Seq)
	require.Equal(t, uint64(1), ap1.LamportTime)
	require.Nil(t, ap1.Deps)
	require.True(t, obj.Equals(ap1.ObjectID))
	require.False(t, ap1.CreateTime.IsZero())
	require.NotEmpty(t, ap1.signature)
	require.Equal(t, []byte("alice-patch-1"), ap1.Body)
	require.Equal(t, kind, ap1.Kind)

	require.Equal(t, uint64(1), s.lamportTime, "state must increment internal clock")
	require.Equal(t, []cid.Cid{ap1.cid}, s.deps, "state must remember new patch as next dependency")
	require.Equal(t, map[cid.Cid]uint64{ap1.peer: 1}, s.seqs, "state must record peer seq")

	ap2 := mustNewPatch(s.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-2")))
	require.Equal(t, uint64(2), ap2.Seq)
	require.Equal(t, uint64(2), ap2.LamportTime)
	require.Len(t, ap2.Deps, 1)
	require.Equal(t, []cid.Cid{ap1.cid}, ap2.Deps)

	require.Equal(t, uint64(2), s.lamportTime, "state must increment internal clock")
	require.Equal(t, []cid.Cid{ap2.cid}, s.deps, "state must remember new patch as next dependency")
	require.Equal(t, map[cid.Cid]uint64{ap1.peer: 2}, s.seqs, "state must record peer seq")
}

func TestPatchRDTState_Concurrent(t *testing.T) {
	alice := makeTester(t, "alice")
	bob := makeTester(t, "bob")
	obj := testutil.MakeCID(t, "document-1")
	kind := PatchKind("test-patch")

	as := newChangeset(obj, nil)
	ap := []signedPatch{
		mustNewPatch(as.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-1"))),
		mustNewPatch(as.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-2"))),
		mustNewPatch(as.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-3"))),
		mustNewPatch(as.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-4"))),
	}

	bs := newChangeset(obj, nil)
	bp := []signedPatch{
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-1"))),
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-2"))),
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-3"))),
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-4"))),
		mustNewPatch(bs.NewPatch(cid.Cid(bob.Account.CID()), bob.Device, kind, []byte("bob-patch-5"))),
	}

	merged := newChangeset(obj, [][]signedPatch{ap, bp})
	require.Equal(t, len(ap)+len(bp), merged.size)

	// TODO: see if we need to solve interleaving.
	expected := []string{"alice-patch-1", "bob-patch-1", "alice-patch-2", "bob-patch-2",
		"alice-patch-3", "bob-patch-3", "alice-patch-4", "bob-patch-4", "bob-patch-5"}

	for i, sp := range merged.Merge() {
		require.Equal(t, expected[i], string(sp.Body))
	}

	ap = append(ap, mustNewPatch(merged.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-5"))))
	ap = append(ap, mustNewPatch(merged.NewPatch(cid.Cid(alice.Account.CID()), alice.Device, kind, []byte("alice-patch-6"))))

	require.Equal(t, uint64(5), ap[4].Seq)
	require.Equal(t, uint64(6), ap[4].LamportTime)
	require.Equal(t, uint64(10), ap[4].LogTime)
	// TODO: see if we need to sort deps deterministically.
	require.Equal(t, []cid.Cid{ap[3].cid, bp[4].cid}, ap[4].Deps, "concurrent patch must specify all deps")

	require.Equal(t, uint64(6), ap[5].Seq)
	require.Equal(t, uint64(7), ap[5].LamportTime)
	require.Equal(t, uint64(11), ap[5].LogTime)
	require.Equal(t, []cid.Cid{ap[4].cid}, ap[5].Deps)

	merged = newChangeset(obj, [][]signedPatch{bp, ap})
	expected = []string{"alice-patch-1", "bob-patch-1", "alice-patch-2", "bob-patch-2",
		"alice-patch-3", "bob-patch-3", "alice-patch-4", "bob-patch-4", "bob-patch-5", "alice-patch-5", "alice-patch-6"}

	for i, sp := range merged.Merge() {
		require.Equal(t, expected[i], string(sp.Body))
	}
}

func mustNewPatch(sp signedPatch, err error) signedPatch {
	if err != nil {
		panic(err)
	}

	return sp
}
