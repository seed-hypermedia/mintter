package rpc

import (
	"crypto/rand"
	"fmt"
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
)

func newSeed() (*aezeed.CipherSeed, error) {
	var entropy [aezeed.EntropySize]byte

	if _, err := rand.Read(entropy[:]); err != nil {
		return nil, fmt.Errorf("unable to generate random seed: %w", err)
	}

	return aezeed.New(keychain.KeyDerivationVersion, &entropy, time.Now())
}
