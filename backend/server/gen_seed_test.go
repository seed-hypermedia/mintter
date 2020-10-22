package server_test

import (
	"context"
	proto "mintter/api/go/v2"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGenSeed(t *testing.T) {
	srv := newServer(t)
	defer require.NoError(t, srv.Close())

	ctx := context.Background()

	resp, err := srv.GenSeed(ctx, &proto.GenSeedRequest{})

	require.NoError(t, err)
	require.Equal(t, 24, len(resp.Mnemonic), "mnemonic must be be 24 words long")
}
