package core

import (
	"bytes"
	"fmt"
	"mintter/backend/pkg/slip10"
	"strings"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/tyler-smith/go-bip39"
)

type AccountID struct {
	str string
	c   cid.Cid
}

func AccountIDFromString(s string) (a AccountID, err error) {
	c, err := cid.Decode(s)
	if err != nil {
		return a, err
	}

	return AccountIDFromCID(c)
}

func AccountIDFromCID(c cid.Cid) (a AccountID, err error) {
	if c.Prefix().Codec != CodecAccountKey {
		return a, fmt.Errorf("cid is not an account key")
	}

	return AccountID{str: c.String(), c: c}, nil
}

// CID returns the wrapped CID object.
func (aid AccountID) CID() cid.Cid {
	return aid.c
}

// String representation of the Account ID.
func (aid AccountID) String() string {
	return aid.str
}

// Equals checks if two Account IDs are equal.
func (aid AccountID) Equals(other AccountID) bool {
	return aid.c.Equals(other.c)
}

type DeviceID struct {
	str string
	pid peer.ID
	c   cid.Cid
}

func DeviceIDFromString(s string) (d DeviceID, err error) {
	c, err := cid.Decode(s)
	if err != nil {
		return d, err
	}

	return DeviceIDFromCID(c)
}

func DeviceIDFromCID(c cid.Cid) (d DeviceID, err error) {
	if c.Prefix().Codec != CodecDeviceKey {
		return d, fmt.Errorf("cid is not a device key")
	}

	pid, err := peer.FromCid(c)
	if err != nil {
		return d, fmt.Errorf("failed to parse peer id from cid: %w", err)
	}

	return DeviceID{
		str: c.String(),
		c:   c,
		pid: pid,
	}, nil
}

func (did DeviceID) String() string {
	return did.str
}

func (did DeviceID) CID() cid.Cid {
	return did.c
}

func (did DeviceID) PeerID() peer.ID {
	return did.pid
}

type Identity struct {
	acc           PublicKey
	deviceKeyPair KeyPair
}

func NewIdentity(account PublicKey, device KeyPair) Identity {
	if account.Codec() != CodecAccountKey {
		panic("not account key")
	}

	if device.Codec() != CodecDeviceKey {
		panic("not device key")
	}

	return Identity{
		acc:           account,
		deviceKeyPair: device,
	}
}

func (i Identity) Account() PublicKey {
	return i.acc
}

func (i Identity) AccountID() cid.Cid {
	return i.acc.CID()
}

func (i Identity) DeviceKey() KeyPair { return i.deviceKeyPair }

func (i Identity) IsWritable() bool {
	return i.deviceKeyPair.k != nil
}

// AccountFromMnemonic returns a key pair (priv + pub) derived
// from the entropy associated to the given mnemonics. The mnemonics
// can have a non empty passphrase
func AccountFromMnemonic(m []string, passphrase string) (KeyPair, error) {
	seed, err := bip39.NewSeedWithErrorChecking(strings.Join(m[:], " "), passphrase)
	if err != nil {
		return KeyPair{}, fmt.Errorf("unable to set seed password from mnemonics: %w", err)
	}

	return AccountFromSeed(seed)
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
func NewMnemonic(length uint32, passphrase string) ([]string, error) {
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

	seed, err := bip39.NewSeedWithErrorChecking(mnemonic, passphrase)
	if err != nil {
		return nil, fmt.Errorf("unable to set seed password from mnemonics: %w", err)
	}
	mnemonic, err = bip39.NewMnemonic(seed)
	if err != nil {
		return nil, fmt.Errorf("unable to generate mnemonics from password seed: %w", err)
	}

	return strings.Fields(mnemonic), nil
}
