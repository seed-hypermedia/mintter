package backend

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSyncDeletedPublication(t *testing.T) {
	alice := testBackend{makeTestBackend(t, "alice", true)}
	bob := testBackend{makeTestBackend(t, "bob", true)}
	ctx := context.Background()

	pub1 := alice.TAddPublication(t, ctx, "alice-pub-1", "", []byte("hello world"), nil)
	pub2 := alice.TAddPublication(t, ctx, "alice-pub-2", "", []byte("hello world"), nil)
	pub3 := alice.TAddPublication(t, ctx, "alice-pub-3", "", []byte("hello world"), nil)

	require.NoError(t, alice.DeletePublication(ctx, pub2.ID))

	connectPeers(ctx, t, alice.backend, bob.backend, true)

	require.NoError(t, bob.SyncAccounts(ctx))

	require.Equal(t, pub1, bob.TGetPublication(t, ctx, pub1.ID), "bob must get publication from alice before deletion")
	_, err := bob.GetPublication(ctx, pub2.ID)
	require.Error(t, err, "bob must fail to get deleted publication")
	require.Equal(t, pub3, bob.TGetPublication(t, ctx, pub3.ID), "bob must continue to receive publications from alice after deletion")
}
