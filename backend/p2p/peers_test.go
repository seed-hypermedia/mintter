package p2p_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConnect(t *testing.T) {
	ctx := context.Background()

	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")

	addrs, err := bob.Addrs()
	require.NoError(t, err)

	err = alice.Connect(ctx, addrs...)
	require.NoError(t, err)

	require.ElementsMatch(t,
		alice.Host().Peerstore().Peers(),
		bob.Host().Peerstore().Peers(),
		"both peers must have each other in the peer store")

	require.NoError(t, alice.Connect(ctx, addrs...), "connecting more than once must not fail")
}
