package server_test

import (
	"context"
	"mintter/proto"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConnectToPeer(t *testing.T) {
	ctx := context.Background()

	alice := newSeededServer(t, testMnemonic...)
	bob := newSeededServer(t, testMnemonic2...)

	t.Cleanup(func() {
		require.NoError(t, alice.Close())
		require.NoError(t, bob.Close())
	})

	bobaddrs, err := bob.GetProfileAddrs(ctx, &proto.GetProfileAddrsRequest{})
	require.NoError(t, err)

	_, err = alice.ConnectToPeer(ctx, &proto.ConnectToPeerRequest{
		Addrs: bobaddrs.Addrs,
	})
	require.NoError(t, err)
}
