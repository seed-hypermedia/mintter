package backend

import (
	"context"
	"testing"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"

	"mintter/backend/db/sqliteschema"
	"mintter/backend/testutil"
)

func TestDBStoreDevice(t *testing.T) {
	ctx := context.Background()

	pool, err := sqliteschema.Open("file::memory:?mode=memory", 0, 1)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})
	require.NoError(t, sqliteschema.MigratePool(ctx, pool))

	graph := &graphdb{pool: pool}

	in := map[AccountID][]DeviceID{
		AccID(testutil.MakeCIDWithCodec(t, codecAccountID, "a1")): {
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a1d1")),
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a1d2")),
			DeviceID(testutil.MakeCIDWithCodec(t, cid.Libp2pKey, "a1d3")),
		},
		AccID(testutil.MakeCIDWithCodec(t, codecAccountID, "a2")): {
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

	all, err := graph.ListAccountDevices(ctx)
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
