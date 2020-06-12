package p2p_test

import (
	"context"
	"testing"
	"time"

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

	status, err := alice.Store().GetProfileConnectionStatus(ctx, bob.Account().ID)
	require.NoError(t, err)
	require.Equal(t, "CONNECTED", status.String())

	status, err = bob.Store().GetProfileConnectionStatus(ctx, alice.Account().ID)
	require.NoError(t, err)
	require.Equal(t, "CONNECTED", status.String())

	require.NoError(t, bob.Host().Network().ClosePeer(alice.Host().ID()))

	require.NoError(t, bob.Disconnect(ctx, alice.Account().ID))

	// This is ugly but avoids flaky test results.
	time.Sleep(500 * time.Millisecond)

	status, err = bob.Store().GetProfileConnectionStatus(ctx, alice.Account().ID)
	require.NoError(t, err)
	require.Equal(t, "NOT_CONNECTED", status.String())

	status, err = alice.Store().GetProfileConnectionStatus(ctx, bob.Account().ID)
	require.NoError(t, err)
	require.Equal(t, "NOT_CONNECTED", status.String())
}
