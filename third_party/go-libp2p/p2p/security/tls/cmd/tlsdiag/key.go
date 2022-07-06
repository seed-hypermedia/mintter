package tlsdiag

import (
	"crypto/rand"
	"fmt"

	ic "github.com/libp2p/go-libp2p-core/crypto"
)

func generateKey(keyType string) (priv ic.PrivKey, err error) {
	switch keyType {
	case "rsa":
		fmt.Printf("Generated new peer with an RSA key.")
		priv, _, err = ic.GenerateRSAKeyPair(2048, rand.Reader)
	case "ecdsa":
		fmt.Printf("Generated new peer with an ECDSA key.")
		priv, _, err = ic.GenerateECDSAKeyPair(rand.Reader)
	case "ed25519":
		fmt.Printf("Generated new peer with an Ed25519 key.")
		priv, _, err = ic.GenerateEd25519Key(rand.Reader)
	case "secp256k1":
		fmt.Printf("Generated new peer with an Secp256k1 key.")
		priv, _, err = ic.GenerateSecp256k1Key(rand.Reader)
	default:
		return nil, fmt.Errorf("unknown key type: %s", keyType)
	}
	return
}
