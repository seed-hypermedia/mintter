package mttnet

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConnect(t *testing.T) {
	t.Parallel()

	alice, stopalice := makeTestPeer(t, "alice")
	defer stopalice()

	bob, stopbob := makeTestPeer(t, "bob")
	defer stopbob()

	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

	checkExchange := func(t *testing.T, a, b *Node) {
		acc, err := a.AccountForDevice(ctx, b.me.DeviceKey().CID())
		require.NoError(t, err)
		require.Equal(t, b.me.AccountID().String(), acc.String())
	}

	checkExchange(t, alice, bob)
	checkExchange(t, bob, alice)
}
