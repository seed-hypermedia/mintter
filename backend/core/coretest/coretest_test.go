package coretest

import (
	"seed/backend/core"
	"testing"

	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/stretchr/testify/require"
)

func TestKeys(t *testing.T) {
	alice := NewTester("alice")

	pid, err := peer.IDFromPrivateKey(alice.Device.Wrapped())
	require.NoError(t, err)

	require.True(t, alice.Device.ID() == pid)
}

func TestEncoding(t *testing.T) {
	alice := NewTester("alice")

	data, err := alice.Account.MarshalBinary()
	require.NoError(t, err)

	pk, err := core.ParsePublicKey(data)
	require.NoError(t, err)
	require.Equal(t, alice.Account.String(), pk.String())
}
