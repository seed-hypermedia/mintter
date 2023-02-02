package mttnet

import (
	"context"
	"mintter/backend/config"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"
)

func TestP2PCall(t *testing.T) {
	t.Parallel()
	cfg := config.Default()
	cfg.Site.Hostname = "example.com"
	site, stopalice := makeTestPeer(t, "alice", cfg.Site)
	defer stopalice()

	bob, stopbob := makeTestPeer(t, "bob")
	defer stopbob()

	ctx := context.Background()

	checkExchange := func(t *testing.T, a, b *Node) {
		acc, err := a.AccountForDevice(ctx, b.me.DeviceKey().CID())
		require.NoError(t, err)
		require.Equal(t, b.me.AccountID().String(), acc.String())
	}

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		require.NoError(t, site.Connect(ctx, bob.AddrInfo()))
		checkExchange(t, site, bob)
		checkExchange(t, bob, site)
		return nil
	})

	require.NoError(t, g.Wait())

	require.NoError(t, site.Connect(ctx, bob.AddrInfo()), "connecting twice must not fail")
}
