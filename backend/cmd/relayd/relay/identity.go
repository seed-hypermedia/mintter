package relay

import (
	"encoding/hex"
	"os"

	"github.com/libp2p/go-libp2p/core/crypto"
)

func newPrivKeyString(priv crypto.PrivKey) (key string, err error) {
	if priv == nil {
		priv, _, err = crypto.GenerateKeyPair(crypto.Ed25519, 0)
		if err != nil {
			return "", err
		}
	}

	bytes, err := crypto.MarshalPrivateKey(priv)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(bytes), nil
}

func generateIdentity(path string) (crypto.PrivKey, error) {
	// TODO: Change hardcoded signature schema.
	privK, _, err := crypto.GenerateKeyPair(crypto.Ed25519, 0)
	if err != nil {
		return nil, err
	}

	bytes, err := crypto.MarshalPrivateKey(privK)
	if err != nil {
		return nil, err
	}

	err = os.WriteFile(path, bytes, 0400)

	return privK, err
}
