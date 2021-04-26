package backend

import (
	"mintter/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMakeDepKey(t *testing.T) {
	obj := testutil.MakeCID(t, "hello-world")
	dep := testutil.MakeCID(t, "dep-1")

	expected := []byte{'m', 't', 't', DefaultPrefix, 0x01}
	expected = append(expected, obj.Bytes()...)
	expected = append(expected, 0x03)
	expected = append(expected, dep.Bytes()...)

	key := makeDepKey(obj, dep)
	require.Equal(t, expected, key)
}

func TestMakeKeyUIDForPeer(t *testing.T) {
	peer := testutil.MakeCID(t, "test-peer")

	var expected []byte
	expected = append(expected, keyNamespace...)
	expected = append(expected, DefaultPrefix, byteUIDBase, byteUIDPeers)
	expected = append(expected, peer.Bytes()...)

	k := makeKeyUIDForPeer(peer)
	require.Equal(t, expected, k)
}

func TestMakeKeyLastSeqForPeer(t *testing.T) {
	var expected []byte
	expected = append(expected, keyNamespace...)
	expected = append(expected, DefaultPrefix, byteObjectsBase)
	expected = append(expected, 0, 0, 0, 0, 0, 0, 0, 1) // object uid
	expected = append(expected, byteObjectsLastSeq)
	expected = append(expected, 0, 0, 0, 0, 0, 0, 0, 2) // peer uid

	k := makeKeyLastSeqForPeer(1, 2)
	require.Equal(t, expected, k)
}

func TestMakeKeyPeerPatch(t *testing.T) {
	k := makeKeyPeerPatch(1, 2, 3, 4)

	var expected []byte
	expected = append(expected, keyNamespace...)
	expected = append(expected, DefaultPrefix, byteObjectsBase)
	expected = append(expected, 0, 0, 0, 0, 0, 0, 0, 1) // object uid
	expected = append(expected, byteObjectsPatches)
	expected = append(expected, 0, 0, 0, 0, 0, 0, 0, 2) // peer uid
	expected = append(expected, 0, 0, 0, 0, 0, 0, 0, 3) // seq
	expected = append(expected, 0, 0, 0, 0, 0, 0, 0, 4) // lamport

	require.Equal(t, expected, k)
}
