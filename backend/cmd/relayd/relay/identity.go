package relay

import (
	"fmt"
	"io/ioutil"
	"os"

	"github.com/libp2p/go-libp2p/core/crypto"
)

// LoadIdentity tries to load an identity (private key from file)
// if there is no key in that file, then LoadIdentity creates a
// fresh new key and stores it in the provided path.
func LoadIdentity(idPath string) (crypto.PrivKey, error) {
	if _, err := os.Stat(idPath); err == nil {
		return readIdentity(idPath)
	} else if os.IsNotExist(err) {
		fmt.Printf("Generating peer identity in %s\n", idPath)
		return generateIdentity(idPath)
	} else {
		return nil, err
	}
}

func readIdentity(path string) (crypto.PrivKey, error) {
	bytes, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	return crypto.UnmarshalPrivateKey(bytes)
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

	err = ioutil.WriteFile(path, bytes, 0400)

	return privK, err
}
