package core

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"mintter/backend/pkg/slip10"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
)

type Identity struct {
	account       cid.Cid
	deviceKeyPair KeyPair
}

func NewIdentity(acc cid.Cid, device KeyPair) Identity {
	if acc.Prefix().Codec != CodecAccountKey {
		panic("not account key")
	}

	if device.Codec() != CodecDeviceKey {
		panic("not device key")
	}

	return Identity{
		account:       acc,
		deviceKeyPair: device,
	}
}

func (i Identity) AccountID() cid.Cid { return i.account }

func (i Identity) DeviceKey() KeyPair { return i.deviceKeyPair }

func (i Identity) IsWritable() bool {
	return i.deviceKeyPair.k != nil
}

func AccountFromMnemonic(m aezeed.Mnemonic, passphrase string) (KeyPair, error) {
	if len(m) != aezeed.NumMnemonicWords {
		return KeyPair{}, fmt.Errorf("mnemonic must be %d words", aezeed.NumMnemonicWords)
	}

	seed, err := m.ToCipherSeed([]byte(passphrase))
	if err != nil {
		return KeyPair{}, err
	}

	return AccountFromSeed(seed.Entropy[:])
}

// AccountDerivationPath value according to SLIP-10 and BIP-44.
// 109116116 is the concatenation of decimal values of letters mtt - stands for Mintter.
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

	return NewKeyPair(CodecAccountKey, priv.(*crypto.Ed25519PrivateKey))
}

// NewMnemonic creates a new random seed encoded with mnemonic words.
func NewMnemonic(passphraze string) ([]string, error) {
	var entropy [aezeed.EntropySize]byte

	if _, err := rand.Read(entropy[:]); err != nil {
		return nil, fmt.Errorf("unable to generate random seed: %w", err)
	}

	seed, err := aezeed.New(keychain.KeyDerivationVersion, &entropy, time.Now())
	if err != nil {
		return nil, err
	}

	mnem, err := seed.ToMnemonic([]byte(passphraze))
	if err != nil {
		return nil, err
	}

	return mnem[:], nil
}
