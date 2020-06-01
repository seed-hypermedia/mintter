package server_test

import (
	"context"
	"mintter/backend/server"
	"mintter/proto"
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
