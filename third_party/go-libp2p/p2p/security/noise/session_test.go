package noise

import (
	"context"
	"testing"

	"github.com/libp2p/go-libp2p-core/crypto"

	"github.com/stretchr/testify/require"
)

func TestContextCancellationRespected(t *testing.T) {
	initTransport := newTestTransport(t, crypto.Ed25519, 2048)
	respTransport := newTestTransport(t, crypto.Ed25519, 2048)

	init, resp := newConnPair(t)
	defer init.Close()
	defer resp.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := initTransport.SecureOutbound(ctx, init, respTransport.localID)
	require.Error(t, err)
	require.Equal(t, ctx.Err(), err)
}
