// Package identity provides the identity of the user.
package identity

import (
	"bytes"
	"fmt"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/textileio/go-textile/wallet"
)

// ProfileID is a unique global id for an account.
// It has the same mechanics as libp2p peer ID
// but is not interchangeable.
type ProfileID peer.ID

// P2PConfig for libp2p network.
type P2PConfig struct {
	PeerID  peer.ID
	PubKey  PubKey
	PrivKey PrivKey
}

// Profile is the main identity of a user.
type Profile struct {
	ID      peer.ID
	PubKey  PubKey
	PrivKey PrivKey
	PeerID  peer.ID
	// TODO(burdiyan): add profile id similar to peer id.

	Username string
	Email    string
	Bio      string
}

// FromSeed generates a profile based on seed.
func FromSeed(seed []byte, idx uint32) (Profile, error) {
	masterKey, err := wallet.NewMasterKey(seed)
	if err != nil {
		return Profile{}, err
	}

	k, err := masterKey.Derive(wallet.FirstHardenedIndex + idx)
	if err != nil {
		return Profile{}, fmt.Errorf("identity: failed to derive child key: %w", err)
	}

	priv, pub, err := crypto.GenerateEd25519Key(bytes.NewReader(k.Key))
	if err != nil {
		return Profile{}, fmt.Errorf("identity: failed to generate key pair: %w", err)
	}

	peerID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return Profile{}, fmt.Errorf("identity: failed to generated peer id: %w", err)
	}

	return Profile{
		ID:      peerID,
		PubKey:  PubKey{pub},
		PeerID:  peerID,
		PrivKey: PrivKey{priv},
	}, nil
}
