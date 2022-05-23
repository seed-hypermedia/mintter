package mttnet

import (
	"context"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"testing"
	"time"

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

	// Wait a bit until peers are verified.
	// TODO: provide some hooks to wait for verification explicitly.
	time.Sleep(time.Second)

	checkExchange := func(t *testing.T, a, b *Node) {
		ver, err := a.vcs.LoadNamedVersion(ctx, b.accountObjectID, a.me.AccountID(), a.me.DeviceKey().CID(), "main")
		require.NoError(t, err)

		acc := vcstypes.NewAccount(b.accountObjectID, b.me.AccountID())
		err = a.vcs.IterateChanges(ctx, b.accountObjectID, ver, func(rc vcs.RecordedChange) error {
			return acc.ApplyChange(rc.ID, rc.Change)
		})
		require.NoError(t, err)

		_, ok := acc.State().Devices[b.me.DeviceKey().CID()]
		require.True(t, ok)
	}

	checkExchange(t, alice, bob)
	checkExchange(t, bob, alice)

	acc, err := bob.repo.LoadAccount(ctx, alice.me.AccountID(), vcs.Version{})
	require.NoError(t, err)
	require.NotNil(t, acc)
}
