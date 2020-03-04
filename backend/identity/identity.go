package identity

import (
	"bytes"
	"crypto/ed25519"
	"encoding/binary"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/textileio/go-textile/wallet"
	"github.com/textileio/go-threads/core/thread"
)

// Profile is the main identity of a user.
type Profile struct {
	tid       thread.ID
	masterKey *wallet.Key
	pubKey    crypto.PubKey
	privKey   crypto.PrivKey
}

// ThreadID returns a stable ID for Textile v2 Threads based on the profile public key.
func (p *Profile) ThreadID() thread.ID {
	return p.tid
}

// PubKey returns private root key.
func (p *Profile) PubKey() crypto.PubKey {
	return p.pubKey
}

// PrivKey returns private root key.
func (p *Profile) PrivKey() crypto.PrivKey {
	return p.privKey
}

func (p *Profile) Child(idx uint32) (crypto.PrivKey, crypto.PubKey, error) {
	k, err := p.masterKey.Derive(wallet.FirstHardenedIndex + idx)
	if err != nil {
		return nil, nil, err
	}

	return crypto.GenerateEd25519Key(bytes.NewReader(k.Key))
}

// FromSeed generates a profile based on seed.
func FromSeed(seed []byte) (*Profile, error) {
	masterKey, err := wallet.NewMasterKey(seed)
	if err != nil {
		return nil, err
	}

	priv, pub, err := crypto.GenerateEd25519Key(bytes.NewReader(masterKey.Key))
	if err != nil {
		return nil, err
	}

	pubkey, err := pub.Raw()
	if err != nil {
		return nil, err
	}

	return &Profile{
		masterKey: masterKey,
		pubKey:    pub,
		privKey:   priv,
		tid:       threadIDFromPubKey(thread.Raw, pubkey),
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
