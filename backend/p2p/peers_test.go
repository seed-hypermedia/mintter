package p2p

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConnectToPeer(t *testing.T) {
	ctx := context.Background()

	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")

	err := alice.Connect(ctx, bob.Addrs()...)
	require.NoError(t, err)

	require.ElementsMatch(t, alice.Host().Peerstore().Peers(), bob.Host().Peerstore().Peers())

	dur, err := alice.Ping(ctx, bob.peer.ID)
	require.NoError(t, err)

	fmt.Println(dur)
}
