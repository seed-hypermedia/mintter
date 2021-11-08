package core

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding"
	"fmt"
	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/slip10"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
	"github.com/multiformats/go-multihash"
	"google.golang.org/protobuf/proto"
)

func init() {
	cid.Codecs["mintter-account"] = codecAccountID
	cid.CodecToStr[codecAccountID] = "mintter-account"
}

const codecAccountID uint64 = 1091161161

// Key derivation path value according to SLIP-10 and BIP-44.
// 109116116 is the concatenation of decimal values of letters mtt - stands for Mintter.
const slip10DerivationPath = "m/44'/109116116'/0'"

type AccountList struct {
	Accounts   []*AccountAggregate
	NextCursor string
}

type AccountRepository interface {
	LoadAccount(context.Context, AccountID) (*AccountAggregate, error)
	StoreAccount(context.Context, *AccountAggregate) error
	LoadAccountForDevice(context.Context, DeviceID) (*AccountAggregate, error)
	ListAccounts(ctx context.Context, limit int, cursor string) (AccountList, error)
}

type Profile struct {
	Alias string
	Bio   string
	Email string
}

func (p *Profile) Merge(np Profile) error {
	// TODO:
	return nil
}

type AccountAggregate struct {
	changes Changes
	account Account
	devices map[DeviceID]Device
	profile Profile
}

func NewRegisteredAccountAggregate(a Account, d Device) (*AccountAggregate, error) {
	binding, err := InviteDevice(a, d)
	if err != nil {
		return nil, fmt.Errorf("failed to bind device and account: %w", err)
	}

	// TODO:
	changes, err := NewProtoChange(Changes{}, &accounts.DeviceRegistered{
		Proof: binding.AccountProof,
	})
	if err != nil {
		return nil, err
	}

	return &AccountAggregate{
		changes: changes,
		account: a,
		devices: map[DeviceID]Device{
			d.ID: d,
		},
	}, nil
}

func (a *AccountAggregate) Account() Account {
	return a.account
}

func (a *AccountAggregate) UpdateBio(s string) {
	if s == "" {
		return
	}

	// TODO
}

func (a *AccountAggregate) UpdateEmail(s string) error {
	if s == "" {
		return nil
	}

	// TODO: validate email
	return nil
}

func (a *AccountAggregate) UpdateAlias(s string) {
	if s == "" {
		return
	}

	// TODO
}

// NewAccount creates a new Account from a private key.
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
		ID:         aid,
		PrivateKey: pk,
		PublicKey:  pub,
	}, nil
}

// NewAccountFromMnemonic creates a new account from an Aezeed seed.
// See: https://github.com/lightningnetwork/lnd/tree/master/aezeed.
func NewAccountFromMnemonic(words []string, passphrase string) (Account, error) {
	var m aezeed.Mnemonic
	if len(words) != len(m) {
		return Account{}, fmt.Errorf("mnemonic must be %d words long, but %d words given", len(m), len(words))
	}

	copy(m[:], words)

	seed, err := m.ToCipherSeed([]byte(passphrase))
	if err != nil {
		return Account{}, fmt.Errorf("failed to convert mnemonic to cipher seed: %w", err)
	}

	return NewAccountFromSeed(seed.Entropy[:])
}

// NewAccountFromSeed creates an Account from a previously generated randomness.
func NewAccountFromSeed(rand []byte) (Account, error) {
	slipSeed, err := slip10.DeriveForPath(slip10DerivationPath, rand)
	if err != nil {
		return Account{}, err
	}

	priv, _, err := crypto.GenerateEd25519Key(bytes.NewReader(slipSeed.Seed()))
	if err != nil {
		return Account{}, err
	}

	return NewAccount(priv)
}

func NewProtoChange(existing Changes, msg proto.Message) (Changes, error) {
	// TODO
	return Changes{}, nil
}

func AccountIDFromPubKey(k crypto.PubKey) (AccountID, error) {
	// TODO
	return AccountID{}, nil
}

type AccountID cid.Cid

// Bytes representation of an ID.
func (aid AccountID) Bytes() []byte {
	return cid.Cid(aid).Bytes()
}

// Hash returns the multihash part of the CID-encoded Account ID.
func (aid AccountID) Hash() multihash.Multihash {
	return cid.Cid(aid).Hash()
}

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

func (aid *AccountID) FromString(s string) error {
	c, err := cid.Decode(s)
	if err != nil {
		return err
	}

	if codec := c.Prefix().Codec; codec != codecAccountID {
		return fmt.Errorf("can't decode cid with codec %d as a Mintter account, expected %d codec", codec, codecAccountID)
	}

	*aid = AccountID(c)

	return nil
}

// IsZero checks whether account ID is zero value.
func (aid AccountID) IsZero() bool {
	return !cid.Cid(aid).Defined()
}

type DeviceID cid.Cid

// Hash returns the multihash part of the CID-encoded Device ID.
func (did DeviceID) Hash() multihash.Multihash {
	return cid.Cid(did).Hash()
}

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

type Account struct {
	ID         AccountID
	PrivateKey crypto.PrivKey // nil for other accounts
	PublicKey  crypto.PubKey
}

type Device struct {
	ID         DeviceID
	AccountID  AccountID
	PrivateKey crypto.PrivKey // nil for other devices
	PublicKey  crypto.PubKey
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
	devProof, err := makeInviteProof(d.PrivateKey, a.ID)
	if err != nil {
		return AccountBinding{}, fmt.Errorf("failed to create device proof: %w", err)
	}

	accProof, err := makeInviteProof(a.PrivateKey, d.ID)
	if err != nil {
		return AccountBinding{}, fmt.Errorf("failed to create account proof: %w", err)
	}

	return AccountBinding{
		Member:       cid.Cid(d.ID),
		Account:      cid.Cid(a.ID),
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
