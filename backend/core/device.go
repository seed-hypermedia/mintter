package core

import (
	"crypto/rand"
	"encoding"
	"fmt"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
)

// Ensure interface implementations.
var (
	_ Verifier                   = DevicePublicKey{}
	_ encoding.BinaryMarshaler   = DevicePublicKey{}
	_ encoding.BinaryUnmarshaler = (*DevicePublicKey)(nil)

	_ Signer = DeviceKey{}
)

// DeviceKey is a full key pair for the Device identity.
type DeviceKey struct {
	privateKey

	pub DevicePublicKey
}

// NewDeviceKeyRandom creates a new random device key.
func NewDeviceKeyRandom() (DeviceKey, error) {
	priv, _, err := crypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return DeviceKey{}, fmt.Errorf("failed to generate device private key: %w", err)
	}

	return NewDeviceKey(priv.(*crypto.Ed25519PrivateKey))
}

// NewDeviceKey creates a device key from an existing private key.
// At the moment only ed25519 keys are supported.
func NewDeviceKey(priv *crypto.Ed25519PrivateKey) (DeviceKey, error) {
	dpk, err := newDevicePublicKey(priv.GetPublic().(*crypto.Ed25519PublicKey))
	if err != nil {
		return DeviceKey{}, err
	}

	return DeviceKey{
		privateKey: newPrivateKey(priv),
		pub:        dpk,
	}, nil
}

// Public part of the device key pair.
func (d DeviceKey) Public() DevicePublicKey {
	return d.pub
}

// DevicePublicKey represents a public part of the device identity.
type DevicePublicKey struct {
	publicKey

	pid peer.ID
}

func newDevicePublicKey(key *crypto.Ed25519PublicKey) (DevicePublicKey, error) {
	pid, err := peer.IDFromPublicKey(key)
	if err != nil {
		return DevicePublicKey{}, fmt.Errorf("failed to generate peer ID from public key: %w", err)
	}

	return DevicePublicKey{
		publicKey: newPublicKey(key),
		pid:       pid,
	}, nil
}

// PeerID returns the IPFS Peer ID of the device.
func (d DevicePublicKey) PeerID() peer.ID {
	return d.pid
}
