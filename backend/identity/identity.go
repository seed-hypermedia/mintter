package identity

import (
	"bytes"
	"crypto/ed25519"
	"encoding/binary"
	"fmt"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/textileio/go-textile/wallet"
	"github.com/textileio/go-threads/core/thread"
)

// Profile is the main identity of a user.
type Profile struct {
	ThreadID thread.ID
	PubKey   crypto.PubKey
	PrivKey  crypto.PrivKey
	PeerID   peer.ID
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
		PubKey:   pub,
		PeerID:   peerID,
		PrivKey:  priv,
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
