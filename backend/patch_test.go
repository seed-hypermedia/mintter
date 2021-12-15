package backend

import (
	"context"
	"sort"
	"testing"

	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/testutil"

	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
)

func TestResolvePatchesE2E(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)

	ctx := context.Background()

	aliceacc, err := alice.LoadState(ctx, cid.Cid(alice.repo.acc.id))
	require.NoError(t, err)
	changes := aliceacc.Merge()

	b1 := changes[len(changes)-1].blk

	connectPeers(ctx, t, alice, bob, false)

	{
		_, err := bob.p2p.bs.Blockstore().Get(ctx, b1.Cid())
		require.Error(t, blockstore.ErrNotFound, err, "bob must not have alice's block in his blockstore")

		blk, err := bob.p2p.bs.GetBlock(ctx, b1.Cid())
		require.NoError(t, err)
		require.Equal(t, b1.RawData(), blk.RawData(), "bob must fetch alice's block using block service")
	}
}

func TestPatchesSort(t *testing.T) {
	alice, err := ipfs.NewCID(cid.Libp2pKey, multihash.IDENTITY, []byte("peer-alice"))
	require.NoError(t, err)
	bob, err := ipfs.NewCID(cid.Libp2pKey, multihash.IDENTITY, []byte("peer-bob"))
	require.NoError(t, err)

	data := []Patch{
		{Author: alice, LamportTime: 3},
		{Author: alice, LamportTime: 2},
		{Author: bob, LamportTime: 3},
		{Author: alice, LamportTime: 1},
	}

	expected := []Patch{
		{Author: alice, LamportTime: 1},
		{Author: alice, LamportTime: 2},
		{Author: bob, LamportTime: 3},
		{Author: alice, LamportTime: 3},
	}

	sort.Slice(data, func(i, j int) bool {
		return data[i].Less(data[j])
	})

	require.Equal(t, expected, data)
}

func TestMergeVersions(t *testing.T) {
	in := []*p2p.Version{
		{
			ObjectId: "obj1",
			VersionVector: []*p2p.PeerVersion{
				{Peer: "p1", Head: "h1", Seq: 1},
			},
		},
		{
			ObjectId: "obj1",
			VersionVector: []*p2p.PeerVersion{
				{Peer: "p1", Head: "h5", Seq: 5},
				{Peer: "p2", Head: "2h10", Seq: 10},
			},
		},
		{
			ObjectId: "obj1",
			VersionVector: []*p2p.PeerVersion{
				{Peer: "p3", Head: "3h5", Seq: 5},
				{Peer: "p2", Head: "2h10", Seq: 10},
			},
		},
	}

	want := map[string]*p2p.PeerVersion{
		"p1": {Peer: "p1", Head: "h5", Seq: 5},
		"p2": {Peer: "p2", Head: "2h10", Seq: 10},
		"p3": {Peer: "p3", Head: "3h5", Seq: 5},
	}

	merged := mergeVersions(in...)
	require.Equal(t, len(want), len(merged.VersionVector), "length's must match")

	for _, pv := range merged.VersionVector {
		testutil.ProtoEqual(t, want[pv.Peer], pv, "peer %s must match", pv.Peer)
	}
}
