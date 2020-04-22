package p2p_test

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"os"
	"testing"

	"mintter/backend/identity"
	"mintter/backend/p2p"
	"mintter/backend/store"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func makeTestNode(t *testing.T, name string) *p2p.Node {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	repoPath := makeTestRepoPath(t)
	prof := makeTestProfile(t, name)
	s, err := store.Create(repoPath, prof)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	n, err := p2p.NewNode(ctx, repoPath, s, zap.NewNop(), p2p.Config{Addr: "/ip4/0.0.0.0/tcp/0"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, n.Close())
	})

	return n
}

func makeTestProfile(t *testing.T, name string) identity.Profile {
	t.Helper()

	data, err := ioutil.ReadFile("testdata/profiles/" + name + ".json")
	require.NoError(t, err)

	var p identity.Profile
	require.NoError(t, json.Unmarshal(data, &p))

	return p
}

func makeTestRepoPath(t *testing.T) string {
	t.Helper()

	dir, err := ioutil.TempDir(os.TempDir(), "p2p-test-repo")
	require.NoError(t, err)

	t.Cleanup(func() {
		os.RemoveAll(dir)
	})

	return dir
}
