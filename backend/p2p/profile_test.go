package p2p

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetProfile(t *testing.T) {
	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.Addrs()...))

	prof, err := alice.GetProfile(ctx, bob.peer.ID)
	require.NoError(t, err)

	require.Equal(t, bob.acc.ID, prof.Account.ID)
}
