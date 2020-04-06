package identity

import (
	"bytes"
	"crypto/ed25519"
	"encoding/binary"
	"encoding/json"
	"fmt"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/textileio/go-textile/wallet"
	"github.com/textileio/go-threads/core/thread"
)

// PubKey wraps crypto.PubKey to enable JSON encoding.
type PubKey struct {
	crypto.PubKey
}

// MarshalJSON implements json.Marshaler.
func (pk PubKey) MarshalJSON() ([]byte, error) {
	raw, err := crypto.MarshalPublicKey(pk)
	if err != nil {
		return nil, err
	}

	return json.Marshal(raw)
}

// UnmarshalJSON implements json.Unmarshaler.
func (pk *PubKey) UnmarshalJSON(data []byte) error {
	var in []byte
	if err := json.Unmarshal(data, &in); err != nil {
		return err
	}

	k, err := crypto.UnmarshalPublicKey(in)
	if err != nil {
		return err
	}

	pk.PubKey = k

	return nil
}

// PrivKey wraps crypto.PrivKey to enable JSON encoding.
type PrivKey struct {
	crypto.PrivKey
}

// MarshalJSON implements json.Marshaler.
func (pk PrivKey) MarshalJSON() ([]byte, error) {
	raw, err := crypto.MarshalPrivateKey(pk)
	if err != nil {
		return nil, err
	}

	return json.Marshal(raw)
}

// UnmarshalJSON implements json.Unmarshaler.
func (pk *PrivKey) UnmarshalJSON(data []byte) error {
	var in []byte
	if err := json.Unmarshal(data, &in); err != nil {
		return err
	}

	k, err := crypto.UnmarshalPrivateKey(in)
	if err != nil {
		return err
	}

	pk.PrivKey = k

	return nil
}

// Profile is the main identity of a user.
type Profile struct {
	ThreadID thread.ID
	PubKey   PubKey
	PrivKey  PrivKey
	PeerID   peer.ID

	Username        string
	Email           string
	TwitterUsername string
	Bio             string
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

	pubkey, err := pub.Raw()
	if err != nil {
		return Profile{}, fmt.Errorf("identity: failed to convert pub key to raw bytes: %w", err)
	}

	peerID, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return Profile{}, fmt.Errorf("identity: failed to generated peer id: %w", err)
	}

	return Profile{
		PubKey:   PubKey{pub},
		PeerID:   peerID,
		PrivKey:  PrivKey{priv},
		ThreadID: threadIDFromPubKey(thread.Raw, pubkey),
	}, nil
}

func threadIDFromPubKey(v thread.Variant, pk ed25519.PublicKey) thread.ID {
	variant := uint64(v)
	numlen := len(pk)
	// two 8 bytes (max) numbers plus num
	buf := make([]byte, 2*binary.MaxVarintLen64+numlen)
	n := binary.PutUvarint(buf, thread.V1)
	n += binary.PutUvarint(buf[n:], variant)
	cn := copy(buf[n:], pk)
	if cn != numlen {
		panic("copy length is inconsistent")
	}

	t, err := thread.Cast(buf[:n+numlen])
	if err != nil {
		panic(err)
	}

	return t
}
