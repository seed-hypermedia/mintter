package p2p

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConnect(t *testing.T) {
	ctx := context.Background()

	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")

	err := alice.Connect(ctx, bob.Addrs()...)
	require.NoError(t, err)

	require.ElementsMatch(t, alice.Host().Peerstore().Peers(), bob.Host().Peerstore().Peers())
}
