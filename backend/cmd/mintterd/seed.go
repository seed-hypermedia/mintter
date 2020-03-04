package main

import (
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
)

func alice() *aezeed.CipherSeed {
	entropy := [aezeed.EntropySize]byte{41, 32, 223, 130, 129, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}
	walletBirthday := time.Date(2020, 1, 1, 1, 0, 0, 0, time.UTC)

	seed, err := aezeed.New(keychain.KeyDerivationVersion, &entropy, walletBirthday)
	if err != nil {
		panic(err)
	}

	return seed
}

func bob() *aezeed.CipherSeed {
	entropy := [aezeed.EntropySize]byte{41, 32, 223, 130, 22, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}
	walletBirthday := time.Date(2020, 1, 1, 1, 0, 0, 0, time.UTC)

	seed, err := aezeed.New(keychain.KeyDerivationVersion, &entropy, walletBirthday)
	if err != nil {
		panic(err)
	}

	return seed
}
