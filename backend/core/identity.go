package core

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"mintter/backend/pkg/slip10"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
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

	seed, err := aezeed.New(keychain.CurrentKeyDerivationVersion, &entropy, time.Now())
	if err != nil {
		return nil, err
	}

	mnem, err := seed.ToMnemonic([]byte(passphraze))
	if err != nil {
		return nil, err
	}

	return mnem[:], nil
}
