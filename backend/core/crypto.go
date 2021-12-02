package core

import (
	"errors"
	"fmt"

	"github.com/libp2p/go-libp2p-core/crypto"
)

// Meaningful errors.
var (
	ErrBadSignature = errors.New("bad signature")
)

// Signer signs data and produces cryptographic signature.
type Signer interface {
	Sign([]byte) (Signature, error)
}

// Verifier checks that signature corresponds to the data.
type Verifier interface {
	Verify(data []byte, s Signature) error
}

// Signature is a cryptographic signature of some piece of data.
type Signature []byte

func (s Signature) verify(k crypto.PubKey, data []byte) error {
	ok, err := k.Verify(data, s)
	if err != nil {
		return fmt.Errorf("%s: %w", err, ErrBadSignature)
	}

	if !ok {
		return ErrBadSignature
	}

	return nil
}

type publicKey struct {
	k *crypto.Ed25519PublicKey
}

func newPublicKey(pub *crypto.Ed25519PublicKey) publicKey {
	return publicKey{
		k: pub,
	}
}

// Verify implements Verifier.
func (pk publicKey) Verify(data []byte, s Signature) error {
	return s.verify(pk.k, data)
}

func (pk publicKey) MarshalBinary() ([]byte, error) {
	return crypto.MarshalPublicKey(pk.k)
}

// UnmarshalBinary implements encoding.BinaryUnmarshaler.
func (pk *publicKey) UnmarshalBinary(data []byte) error {
	if pk.k != nil {
		panic("BUG: unmarshaling already initialized key")
	}

	key, err := crypto.UnmarshalEd25519PublicKey(data)
	if err != nil {
		return err
	}

	pk.k = key.(*crypto.Ed25519PublicKey)
	return nil
}

type privateKey struct {
	k *crypto.Ed25519PrivateKey
}

func newPrivateKey(priv *crypto.Ed25519PrivateKey) privateKey {
	return privateKey{
		k: priv,
	}
}

// Sign implements Signer.
func (pk privateKey) Sign(data []byte) (Signature, error) {
	return pk.k.Sign(data)
}
