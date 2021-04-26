package server_test

import (
	"context"
	proto "mintter/api/go/v2"
	"mintter/backend/server"
	"testing"

	"github.com/stretchr/testify/require"
)

func connectPeers(t *testing.T, ctx context.Context, a, b *server.Server) {
	t.Helper()

	baddrs, err := a.GetProfileAddrs(ctx, &proto.GetProfileAddrsRequest{})
	require.NoError(t, err)

	_, err = b.ConnectToPeer(ctx, &proto.ConnectToPeerRequest{
		Addrs: baddrs.Addrs,
	})
	require.NoError(t, err)
}

func TestConnect(t *testing.T) {
	t.Helper()
	alice := newSeededServer(t, "alice")
	bob := newSeededServer(t, "bob")
	defer func() {
		require.NoError(t, alice.Close())
		require.NoError(t, bob.Close())
	}()
	ctx := context.Background()

	connectPeers(t, ctx, alice, bob)

	bobprof, err := bob.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)

	alicebob, err := alice.GetProfile(ctx, &proto.GetProfileRequest{ProfileId: bobprof.Profile.AccountId})
	require.NoError(t, err)
	require.Equal(t, proto.ConnectionStatus_CONNECTED, alicebob.Profile.ConnectionStatus)

	// TODO: check if profile fetched correctly.
}
