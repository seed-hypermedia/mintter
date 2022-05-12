package coretest

import (
	"testing"

	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/stretchr/testify/require"
)

func TestKeys(t *testing.T) {
	alice := NewTester("alice")

	pid, err := peer.IDFromPrivateKey(alice.Device.Wrapped())
	require.NoError(t, err)

	require.True(t, alice.DeviceID.Equals(peer.ToCid(pid)))
	require.True(t, alice.Device.ID() == pid)
	require.True(t, alice.Device.CID().Equals(peer.ToCid(pid)))
}
