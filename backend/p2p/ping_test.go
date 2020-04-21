package p2p

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPing(t *testing.T) {
	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.Addrs()...))

	dur, err := alice.Ping(ctx, bob.peer.ID)
	require.NoError(t, err, "alice must be able to ping bob")
	require.NotEqual(t, 0, dur)

	dur, err = bob.Ping(ctx, alice.peer.ID)
	require.NoError(t, err, "bob must be able to ping alice")
	require.NotEqual(t, 0, dur)

	dur, err = bob.Ping(ctx, bob.peer.ID)
	require.Error(t, err, "pinging youself must fail")
}
