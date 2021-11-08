package backend

import (
	"context"
	"testing"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"

	"mintter/backend/badgergraph"
	"mintter/backend/db/graphschema"
	"mintter/backend/testutil"
)

func TestGraphStoreDevice(t *testing.T) {
	bdb := testutil.MakeBadgerV3(t)
	db, err := badgergraph.NewDB(bdb, "mtt-test", graphschema.Schema())
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, db.Close())
	})
	ctx := context.Background()

	graph := &graphdb{db: db}

	in := map[AccountID][]DeviceID{
		AccountID(testutil.MakeCIDWithCodec(t, codecAccountID, "a1")): {
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a1d1")),
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a1d2")),
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a1d3")),
		},
		AccountID(testutil.MakeCIDWithCodec(t, codecAccountID, "a2")): {
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a2d1")),
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a2d2")),
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a2d3")),
		},
	}

	for a, dd := range in {
		for _, d := range dd {
			require.NoError(t, graph.StoreDevice(ctx, a, d))
		}
	}

	all, err := graph.ListAccountDevices()
	require.NoError(t, err)
	require.Equal(t, len(in), len(all))

	listsEqual := func(t *testing.T, a, b []DeviceID) {
		t.Helper()
		aset := make(map[string]struct{}, len(a))
		bset := make(map[string]struct{}, len(b))
		for _, a := range a {
			aset[a.String()] = struct{}{}
		}

		for _, a := range b {
			bset[a.String()] = struct{}{}
		}

		require.Equal(t, aset, bset)
	}

	for k, v := range all {
		listsEqual(t, in[k], v)
	}
}

func TestGraphListAccountDevices(t *testing.T) {
	bdb := testutil.MakeBadgerV3(t)
	db, err := badgergraph.NewDB(bdb, "mtt-test", graphschema.Schema())
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, db.Close())
	})

	graph := &graphdb{db: db}

	list, err := graph.ListAccountDevices()
	require.NoError(t, err)
	require.Nil(t, list)
}
