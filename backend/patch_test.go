package backend

import (
	"mintter/backend/ipfsutil"
	"sort"
	"testing"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
)

func TestPatchesSort(t *testing.T) {
	alice, err := ipfsutil.NewCID(cid.Libp2pKey, multihash.IDENTITY, []byte("peer-alice"))
	require.NoError(t, err)
	bob, err := ipfsutil.NewCID(cid.Libp2pKey, multihash.IDENTITY, []byte("peer-bob"))
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
