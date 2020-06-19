package p2p_test

import (
	"context"
	"testing"

	"mintter/backend/config"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func makeTestNode(t *testing.T, name string) *p2p.Node {
	t.Helper()

	repoPath := testutil.MakeRepoPath(t)
	prof := testutil.MakeProfile(t, name)
	s, err := store.Create(repoPath, prof)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	n, err := p2p.NewNode(repoPath, s, zap.NewNop(), config.P2P{
		Addr:        "/ip4/127.0.0.1/tcp/0",
		NoBootstrap: true,
		NoRelay:     true,
		NoTLS:       true,
	})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, n.Close())
	})

	return n
}

func connectPeers(t *testing.T, ctx context.Context, p1, p2 *p2p.Node) {
	t.Helper()

	addrs, err := p1.Addrs()
	require.NoError(t, err)
	require.NoError(t, p2.Connect(ctx, addrs...))
}
