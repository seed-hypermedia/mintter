package core

import (
	"crypto/rand"
	"encoding"
	"fmt"

	"github.com/libp2p/go-libp2p-core/crypto"
)

// Ensure interface implementations.
var (
	_ Verifier                   = AccountPublicKey{}
	_ encoding.BinaryMarshaler   = AccountPublicKey{}
	_ encoding.BinaryUnmarshaler = (*AccountPublicKey)(nil)

	_ Signer = AccountKey{}
)

// AccountKey is a full key pair for the account identity.
type AccountKey struct {
	privateKey

	pub AccountPublicKey
}

// NewAccountKeyRandom creates a new random account key.
func NewAccountKeyRandom() (AccountKey, error) {
	priv, _, err := crypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return AccountKey{}, fmt.Errorf("failed to generate account private key: %w", err)
	}

	return NewAccountKey(priv.(*crypto.Ed25519PrivateKey))
}

// NewAccountKey creates a account key from an existing private key.
// At the moment only ed25519 keys are supported.
func NewAccountKey(priv *crypto.Ed25519PrivateKey) (AccountKey, error) {
	dpk, err := newAccountPublicKey(priv.GetPublic().(*crypto.Ed25519PublicKey))
	if err != nil {
		return AccountKey{}, err
	}

	return AccountKey{
		privateKey: newPrivateKey(priv),
		pub:        dpk,
	}, nil
}

// Public part of the account key pair.
func (d AccountKey) Public() AccountPublicKey {
	return d.pub
}

// AccountPublicKey represents a public part of the account identity.
type AccountPublicKey struct {
	publicKey
}

func newAccountPublicKey(key *crypto.Ed25519PublicKey) (AccountPublicKey, error) {
	return AccountPublicKey{
		publicKey: newPublicKey(key),
	}, nil
}
