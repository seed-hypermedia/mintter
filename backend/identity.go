package backend

import (
	"bytes"
	"crypto/rand"
	"encoding"
	"fmt"
	"time"

	"mintter/backend/ipfsutil"
	"mintter/backend/slip10"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
	"github.com/multiformats/go-multihash"
)

func init() {
	cbornode.RegisterCborType(AccountBinding{})
	cid.Codecs["mintter-account"] = codecAccountID
	cid.CodecToStr[codecAccountID] = "mintter-account"
}

// See identity_grammar.ebnf for explanation about our identifiers.

const codecAccountID uint64 = 1091161161

// AccountID is the CID representation of the Mintter Account ID.
type AccountID cid.Cid

// Equals check if two Account IDs are equal.
func (aid AccountID) Equals(a AccountID) bool {
	return cid.Cid(aid).Equals(cid.Cid(a))
}

// String returns string representation of the account ID.
func (aid AccountID) String() string {
	return cid.Cid(aid).String()
}

// MarshalBinary implements encoding.BinaryMarshaler.
func (aid AccountID) MarshalBinary() ([]byte, error) {
	return cid.Cid(aid).MarshalBinary()
}

// UnmarshalBinary implements encoding.BinaryUnmarshaler.
func (aid *AccountID) UnmarshalBinary(data []byte) error {
	casted, err := cid.Cast(data)
	if err != nil {
		return err
	}
	*aid = AccountID(casted)
	return nil
}

// IsZero checks whether account ID is zero value.
func (aid AccountID) IsZero() bool {
	return !cid.Cid(aid).Defined()
}

// DeviceID is the Libp2p peer ID wrapped as a CID.
type DeviceID cid.Cid

// String returns string representation of the device ID.
func (did DeviceID) String() string {
	return cid.Cid(did).String()
}

// PeerID converts the device ID into Libp2p peer ID.
func (did DeviceID) PeerID() peer.ID {
	pid, err := peer.FromCid(cid.Cid(did))
	if err != nil {
		// This can only happen if there's a bug in our system and it should be caught in tests.
		// DeviceID is supposed to be validated whenever it is instantiated.
		panic(err)
	}

	return pid
}

// Equals checks whether two device IDs are equal.
func (did DeviceID) Equals(d DeviceID) bool {
	return cid.Cid(did).Equals(cid.Cid(d))
}

// MarshalBinary implements encoding.BinaryMarshaler.
func (did DeviceID) MarshalBinary() ([]byte, error) {
	return cid.Cid(did).MarshalBinary()
}

// UnmarshalBinary implements encoding.BinaryUnmarshaler.
func (did *DeviceID) UnmarshalBinary(data []byte) error {
	casted, err := cid.Cast(data)
	if err != nil {
		return err
	}
	*did = DeviceID(casted)
	return nil
}

// Key derivation path value according to SLIP-10 and BIP-44.
// 109116116 is the concatenation of decimal values of letters mtt - stands for Mintter.
const mttSLIP10Path = "m/44'/109116116'/0'"

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

// Account represents a Mintter account with multiple devices.
type Account struct {
	id   AccountID
	priv crypto.PrivKey
	pub  crypto.PubKey
}

// PublicAccount is a Mintter account without the private key.
type PublicAccount struct {
	id  AccountID
	pub crypto.PubKey
}

// NewPublicAccount creates a PublicAccount from a public key.
func NewPublicAccount(pub crypto.PubKey) (PublicAccount, error) {
	aid, err := AccountIDFromPubKey(pub)
	if err != nil {
		return PublicAccount{}, err
	}

	return PublicAccount{
		id:  aid,
		pub: pub,
	}, nil
}

// NewAccountFromMnemonic creates an Account from previously generated mnemonic phraze.
func NewAccountFromMnemonic(m aezeed.Mnemonic, passphraze string) (Account, error) {
	seed, err := m.ToCipherSeed([]byte(passphraze))
	if err != nil {
		return Account{}, err
	}

	return NewAccountFromSeed(seed.Entropy[:])
}

// NewAccountFromSeed creates an Account from a previously generated randomness.
func NewAccountFromSeed(rand []byte) (Account, error) {
	slipSeed, err := slip10.DeriveForPath(mttSLIP10Path, rand)
	if err != nil {
		return Account{}, err
	}

	priv, _, err := crypto.GenerateEd25519Key(bytes.NewReader(slipSeed.Seed()))
	if err != nil {
		return Account{}, err
	}

	return NewAccount(priv)
}

// NewAccount creates a new Mintter Account from a private key.
func NewAccount(pk crypto.PrivKey) (Account, error) {
	if _, ok := pk.(*crypto.Ed25519PrivateKey); !ok {
		return Account{}, fmt.Errorf("only Ed25519 keys are supported for Mintter Accounts now, got %T", pk)
	}

	pub := pk.GetPublic()

	aid, err := AccountIDFromPubKey(pub)
	if err != nil {
		return Account{}, fmt.Errorf("failed to dervice Account ID: %w", err)
	}

	return Account{
		id:   aid,
		priv: pk,
		pub:  pub,
	}, nil
}

// AccountIDFromPubKey creates a new AccountID from a public key.
func AccountIDFromPubKey(pub crypto.PubKey) (AccountID, error) {
	if _, ok := pub.(*crypto.Ed25519PublicKey); !ok {
		return AccountID{}, fmt.Errorf("only Ed25519 keys are supported for Mintter Account IDs, got: %T", pub)
	}

	pubBytes, err := pub.Raw()
	if err != nil {
		return AccountID{}, err
	}

	acid, err := ipfsutil.NewCID(codecAccountID, multihash.IDENTITY, pubBytes)
	if err != nil {
		return AccountID{}, err
	}

	return AccountID(acid), nil
}

// Device represents a Mintter peer.
type Device struct {
	id   DeviceID
	priv crypto.PrivKey
	pub  crypto.PubKey
}

// NewDevice creates a new device with random keys.
func NewDevice(k crypto.PrivKey) (Device, error) {
	pub := k.GetPublic()

	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return Device{}, err
	}

	return Device{
		id:   DeviceID(peer.ToCid(pid)),
		priv: k,
		pub:  pub,
	}, nil
}

// ID of the device.
func (d Device) ID() DeviceID {
	return d.id
}

// AccountBinding serves to link device (or another account) and account together.
// This becomes a body of a patch.
type AccountBinding struct {
	Member  cid.Cid
	Account cid.Cid
	// MemberProof means that member actually wants to be member of the account.
	MemberProof []byte
	// AccountProof means that account wants to invite another id to be its member.
	AccountProof []byte
}

func (ab AccountBinding) Verify(memberKey, accountKey crypto.PubKey) error {
	if codec := ab.Account.Prefix().Codec; codec != codecAccountID {
		return fmt.Errorf("account ID CID codec must be %v, got %v", codecAccountID, codec)
	}

	if codec := ab.Member.Prefix().Codec; codec != cid.Libp2pKey {
		return fmt.Errorf("member ID CID codec must be %v, got %v", cid.Libp2pKey, codec)
	}

	if err := verifyInviteProof(memberKey, AccountID(ab.Account), ab.MemberProof); err != nil {
		return fmt.Errorf("failed to verify member proof: %w", err)
	}

	if err := verifyInviteProof(accountKey, DeviceID(ab.Member), ab.AccountProof); err != nil {
		return fmt.Errorf("failed to verify account proof: %w", err)
	}

	return nil
}

const accBindingPrefix = "account-binding:"

// InviteDevice to be part of the Account.
func InviteDevice(a Account, d Device) (AccountBinding, error) {
	devProof, err := makeInviteProof(d.priv, a.id)
	if err != nil {
		return AccountBinding{}, fmt.Errorf("failed to create device proof: %w", err)
	}

	accProof, err := makeInviteProof(a.priv, d.id)
	if err != nil {
		return AccountBinding{}, fmt.Errorf("failed to create account proof: %w", err)
	}

	return AccountBinding{
		Member:       cid.Cid(d.id),
		Account:      cid.Cid(a.id),
		MemberProof:  devProof,
		AccountProof: accProof,
	}, nil
}

func makeInviteProof(k crypto.PrivKey, id encoding.BinaryMarshaler) ([]byte, error) {
	idBytes, err := id.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal id: %w", err)
	}

	sig, err := k.Sign(append([]byte(accBindingPrefix), idBytes...))
	if err != nil {
		return nil, fmt.Errorf("failed to sign id with private key: %w", err)
	}

	return sig, nil
}

func verifyInviteProof(k crypto.PubKey, id encoding.BinaryMarshaler, signature []byte) error {
	idBytes, err := id.MarshalBinary()
	if err != nil {
		return err
	}

	ok, err := k.Verify(append([]byte(accBindingPrefix), idBytes...), signature)
	if err != nil {
		return fmt.Errorf("failed to verify invite proof: %w", err)
	}

	if !ok {
		return fmt.Errorf("invite proof signature verification failed")
	}

	return nil
}
