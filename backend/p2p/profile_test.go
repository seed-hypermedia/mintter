package p2p_test

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

	prof, err := alice.GetProfile(ctx, bob.Host().ID())
	require.NoError(t, err)
	require.Equal(t, bob.Account().ID, prof.Account.ID, "bob profile alice requested must be the same as when it was created")

	bobProf, err := alice.Store().GetProfile(ctx, bob.Account().ID)
	require.NoError(t, err, "alice must have bob in the store")
	require.Equal(t, prof, bobProf, "requested profile must be stored as is in the store")

	_, err = bob.Store().GetProfile(ctx, alice.Account().ID)
	require.NoError(t, err, "bob must have alice in the store")
}
