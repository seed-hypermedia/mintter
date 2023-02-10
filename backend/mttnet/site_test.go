package mttnet

import (
	"context"
	"mintter/backend/config"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"
)

func TestLocalPublish(t *testing.T) {
	t.Skip("not ready yet")
	t.Parallel()
	cfg := config.Default()
	cfg.Site.Hostname = "example.com"
	_, stopSite := makeTestPeer(t, "alice", cfg.Site)
	defer stopSite()
}

func TestRemotePublish(t *testing.T) {
	t.Skip("not ready yet")
	t.Parallel()
	owner, stopowner := makeTestPeer(t, "alice")
	defer stopowner()

	//editor, stopeditor := makeTestPeer(t, "bob")
	//defer stopeditor()

	cfg := config.Default()
	cfg.Site.Hostname = "127.0.0.1:55001"

	cfg.Site.OwnerID = owner.accountObjectID.String()
	site, stopSite := makeTestPeer(t, "carol", cfg.Site)
	defer stopSite()

	ctx := context.Background()

	checkExchange := func(t *testing.T, a, b *Node) {
		acc, err := a.AccountForDevice(ctx, b.me.DeviceKey().CID())
		require.NoError(t, err)
		require.Equal(t, b.me.AccountID().String(), acc.String())
	}

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		require.NoError(t, owner.Connect(ctx, site.AddrInfo()))
		checkExchange(t, site, owner)
		checkExchange(t, owner, site)
		return nil
	})

	require.NoError(t, g.Wait())

	require.NoError(t, owner.Connect(ctx, site.AddrInfo()), "connecting twice must not fail")

}
