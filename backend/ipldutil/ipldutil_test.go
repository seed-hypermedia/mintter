package ipldutil

import (
	"context"
	"encoding/json"
	"testing"

	"mintter/backend/store"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"

	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

type testNode struct {
	Name string
}

func init() {
	cbornode.RegisterCborType(testNode{})
}

func TestStore(t *testing.T) {
	profstore := testStore(t)
	ctx := context.Background()

	blk, err := CreateSignedBlock(ctx, profstore, testNode{"Alex"})
	require.NoError(t, err)

	{
		node, err := format.Decode(blk)
		require.NoError(t, err)

		jsondata, err := json.Marshal(node)
		require.NoError(t, err)

		expected := `{"data":{"name":"Alex"},"signature":"u27UGb0sPvI7A0q0FKD4dCV+CYvqwd8fopfLzF5586TjUmz8SqkFDiIvwRn+1F5jU9D/8lTKqsgkZhNcJ2UKBw==","signer":"12D3KooWRcxxE2NiQQBQAZMFau4gwtq7XciGFknfHp5WpHdwTKVH"}`
		require.Equal(t, expected, string(jsondata))
	}

	var data testNode
	err = ReadSignedBlock(ctx, profstore, blk, &data)
	require.NoError(t, err)
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
