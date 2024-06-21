package mttnet

import (
	"testing"
)

func TestConnect(t *testing.T) {
	// TODO(hm24): fix the test.
	// t.Parallel()

	// alice, stopalice := makeTestPeer(t, "alice")
	// defer stopalice()

	// bob, stopbob := makeTestPeer(t, "bob")
	// defer stopbob()

	// carol, stopcarol := makeTestPeer(t, "carol")
	// defer stopcarol()

	// ctx := context.Background()

	// checkExchange := func(t *testing.T, a, b *Node) {
	// 	pid := b.Libp2p().Host.ID()
	// 	acc, err := a.AccountForDevice(ctx, pid)
	// 	require.NoError(t, err)
	// 	require.Equal(t, b.me.Account().String(), acc.String())
	// }

	// g, ctx := errgroup.WithContext(ctx)

	// g.Go(func() error {
	// 	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))
	// 	checkExchange(t, alice, bob)
	// 	checkExchange(t, bob, alice)
	// 	return nil
	// })

	// g.Go(func() error {
	// 	require.NoError(t, alice.Connect(ctx, carol.AddrInfo()))
	// 	checkExchange(t, alice, carol)
	// 	checkExchange(t, carol, alice)
	// 	return nil
	// })

	// require.NoError(t, g.Wait())

	// require.NoError(t, alice.Connect(ctx, bob.AddrInfo()), "connecting twice must not fail")
}
