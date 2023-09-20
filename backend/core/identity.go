package core

import (
	"bytes"
	"fmt"
	"mintter/backend/pkg/slip10"
	"strings"

	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/tyler-smith/go-bip39"
)

type Identity struct {
	account PublicKey
	device  KeyPair
}

func NewIdentity(account PublicKey, device KeyPair) Identity {
	return Identity{
		account: account,
		device:  device,
	}
}

func (i Identity) Account() PublicKey {
	return i.account
}

func (i Identity) DeviceKey() KeyPair { return i.device }

func (i Identity) IsWritable() bool {
	return i.device.k != nil
}

// AccountFromMnemonic returns a key pair (priv + pub) derived
// from the entropy associated to the given mnemonics and a passphrase.
// Different passphrase (null passphrase is a valid passphrase) lead to
// different and valid accounts.
func AccountFromMnemonic(m []string, passphrase string) (KeyPair, error) {
	seed, err := bip39.NewSeedWithErrorChecking(strings.Join(m, " "), passphrase)
	if err != nil {
		return KeyPair{}, fmt.Errorf("unable to derive a seed from mnemonics and password: %w", err)
	}

	return AccountFromSeed(seed)
}

// AccountDerivationPath value according to SLIP-10 and BIP-44.
// 109116116 is the concatenation of Unicode code point values for letters mtt - stands for Mintter.
const AccountDerivationPath = "m/44'/109116116'/0'"

// AccountFromSeed creates an account key pair from a previously generated entropy.
func AccountFromSeed(rand []byte) (KeyPair, error) {
	slipSeed, err := slip10.DeriveForPath(AccountDerivationPath, rand)
	if err != nil {
		return KeyPair{}, err
	}

	priv, _, err := crypto.GenerateEd25519Key(bytes.NewReader(slipSeed.Seed()))
	if err != nil {
		return KeyPair{}, err
	}

	return NewKeyPair(priv.(*crypto.Ed25519PrivateKey))
}

// NewBIP39Mnemonic creates a new random BIP-39 compatible mnemonic words.
func NewBIP39Mnemonic(length uint32) ([]string, error) {
	entropyLen := 0
	switch length {
	case 12:
		entropyLen = 128
	case 15:
		entropyLen = 160
	case 18:
		entropyLen = 192
	case 21:
		entropyLen = 224
	case 24:
		entropyLen = 256
	default:
		return nil, fmt.Errorf("mnemonic length must be 12 | 15 | 18 | 21 | 24 words")
	}
	entropy, err := bip39.NewEntropy(entropyLen)
	if err != nil {
		return nil, fmt.Errorf("unable to generate random seed: %w", err)
	}
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		return nil, fmt.Errorf("unable to generate mnemonics from random seed: %w", err)
	}

	return strings.Split(mnemonic, " "), nil
}
