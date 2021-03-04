package backend

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"mintter/backend/slip10"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
)

// Key derivation path value according to SLIP-10 and BIP-44.
// 109116116 is the concatenation of decimal values of letters mtt - stands for Mintter.
const mttSLIP10Path = "m/44'/109116116'/0'"

// NewMnemonic creates a new random seed encoded with mnemonic words.
func NewMnemonic(passphraze []byte) ([]string, error) {
	var entropy [aezeed.EntropySize]byte

	if _, err := rand.Read(entropy[:]); err != nil {
		return nil, fmt.Errorf("unable to generate random seed: %w", err)
	}

	seed, err := aezeed.New(keychain.KeyDerivationVersion, &entropy, time.Now())
	if err != nil {
		return nil, err
	}

	mnem, err := seed.ToMnemonic(passphraze)
	if err != nil {
		return nil, err
	}

	return mnem[:], nil
}

// Account represents a Mintter account with multiple devices.
type Account struct {
	id   cid.Cid
	priv crypto.PrivKey
	pub  crypto.PubKey
}

func NewAccountFromMnemonic(words []string) (Account, error) {
	return Account{}, nil
}

func NewAccountFromSeed(seed []byte) (Account, error) {
	mttSeed, err := slip10.DeriveForPath(mttSLIP10Path, seed)
	if err != nil {
		return Account{}, err
	}

	priv, pub, err := crypto.GenerateEd25519Key(bytes.NewReader(mttSeed.Seed()))
	if err != nil {
		return Account{}, err
	}

	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return Account{}, err
	}

	return Account{
		id:   peer.ToCid(pid),
		priv: priv,
		pub:  pub,
	}, nil
}

// Device represents a Mintter peer.
type Device struct {
	id   cid.Cid
	priv crypto.PrivKey
	pub  crypto.PubKey
}

func NewDevice() (Device, error) {
	priv, pub, err := crypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return Device{}, err
	}

	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return Device{}, err
	}

	return Device{
		id:   peer.ToCid(pid),
		priv: priv,
		pub:  pub,
	}, nil
}
