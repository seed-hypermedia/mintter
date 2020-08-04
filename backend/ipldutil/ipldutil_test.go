package ipldutil

import (
	"context"
	"encoding/json"
	"testing"

	"mintter/backend/ipfsutil"
	"mintter/backend/store"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"

	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

func TestStore(t *testing.T) {
	profstore := testStore(t)
	bs := testutil.MakeBlockStore(t)
	ctx := context.Background()

	type testNode struct {
		Name string
	}

	cbornode.RegisterCborType(testNode{})

	cid1, err := PutSignedRecord(ctx, bs, profstore, testNode{"Alex"})
	require.NoError(t, err)

	{
		block, err := bs.Get(cid1)
		require.NoError(t, err)

		node, err := format.Decode(block)
		require.NoError(t, err)

		jsondata, err := json.Marshal(node)
		require.NoError(t, err)

		expected := `{"data":{"name":"Alex"},"signature":"u27UGb0sPvI7A0q0FKD4dCV+CYvqwd8fopfLzF5586TjUmz8SqkFDiIvwRn+1F5jU9D/8lTKqsgkZhNcJ2UKBw==","signer":"12D3KooWRcxxE2NiQQBQAZMFau4gwtq7XciGFknfHp5WpHdwTKVH"}`
		require.Equal(t, expected, string(jsondata))
	}

	var data testNode
	require.NoError(t, GetSignedRecord(ctx, ipfsutil.BlockGetterFromBlockStore(bs), profstore, cid1, &data))
	require.Equal(t, "Alex", data.Name)
}

func testStore(t *testing.T) *store.Store {
	t.Helper()
	dir := testutil.MakeRepoPath(t)
	prof := testutil.MakeProfile(t, "alice")

	s, err := store.Create(dir, prof)
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	return s
}
