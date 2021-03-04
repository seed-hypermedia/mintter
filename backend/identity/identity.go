// Package identity provides the identity of the user.
package identity

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"io"
	"time"

	"mintter/backend/slip10"

	"github.com/imdario/mergo"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
)

// ProfileID is the main identity of the Mintter profile. Its semantics are the
// same as libp2p peer ID, but they are not interchangeable.
type ProfileID struct {
	peer.ID
}

// DecodeProfileID from string.
func DecodeProfileID(s string) (ProfileID, error) {
	pid, err := peer.Decode(s)
	p := ProfileID{pid}

	return p, err
}

// Account is a primary Mintter account. Its ID has the same semantics as
// libp2p PeerID, but is not interchangeable and should not be used for libp2p.
// The keys are used to sign all the user's content.
type Account struct {
	ID      ProfileID
	PubKey  PubKey
	PrivKey PrivKey
}

// Peer is the identity for p2p communication.
type Peer struct {
	ID      peer.ID
	PubKey  PubKey
	PrivKey PrivKey // Private Key is only expected for the current user.
}

// About is a mutable human-friendly information about the user.
type About struct {
	Username string `cbor:"username,omitempty"`
	Email    string `cbor:"email,omitempty"`
	Bio      string `cbor:"bio,omitempty"`
}

// Diff two structs and return fields from aa that are chenged.
func (a About) Diff(aa About) (diff About, ok bool) {
	if aa.Email != "" && a.Email != aa.Email {
		diff.Email = aa.Email
		ok = true
	}

	if aa.Username != "" && a.Username != aa.Username {
		diff.Username = aa.Username
		ok = true
	}

	if aa.Bio != "" && a.Bio != aa.Bio {
		diff.Bio = aa.Bio
		ok = true
	}

	return
}

// Profile is the main identity of a user.
//
// TODO(burdiyan): add better separate for crypto and human info.
type Profile struct {
	ID      ProfileID
	Account Account
	Peer    Peer
	About   About
}

// Merge prof into p respecting immutable fields.
func (p *Profile) Merge(prof Profile) error {
	if p.ID.ID != "" {
		prof.ID = ProfileID{}
	}

	// Clear immutable fields
	if p.Account.ID.ID != "" {
		prof.Account = Account{}
	}

	if p.Peer.ID != "" {
		prof.Peer = Peer{}
	}

	return mergo.Merge(p, prof, mergo.WithOverride)
}

type identity struct {
	ID      peer.ID
	PubKey  PubKey
	PrivKey PrivKey // Private Key is only expected for the current user.
}

// newIdentity creates a new identity.
func newIdentity(src io.Reader) (identity, error) {
	priv, pub, err := crypto.GenerateEd25519Key(src)
	if err != nil {
		return identity{}, err
	}

	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return identity{}, err
	}

	return identity{
		ID:      pid,
		PrivKey: PrivKey{priv},
		PubKey:  PubKey{pub},
	}, nil
}

// FromSeed generates a profile based on seed.
func FromSeed(seed []byte, idx uint32) (Profile, error) {
	const primaryAccountPath = "m/44'/406'/0'"
	masterKey, err := slip10.DeriveForPath(primaryAccountPath, seed)
	if err != nil {
		return Profile{}, err
	}

	account, err := newIdentity(bytes.NewReader(masterKey.Seed()))
	if err != nil {
		return Profile{}, fmt.Errorf("failed to create account: %w", err)
	}

	k, err := masterKey.Derive(slip10.FirstHardenedIndex + idx)
	if err != nil {
		return Profile{}, fmt.Errorf("failed to derive child key: %w", err)
	}

	peer, err := newIdentity(bytes.NewReader(k.Seed()))
	if err != nil {
		return Profile{}, fmt.Errorf("failed to create peer: %w", err)
	}

	return Profile{
		ID: ProfileID{account.ID},
		Account: Account{
			ID:      ProfileID{account.ID},
			PrivKey: account.PrivKey,
			PubKey:  account.PubKey,
		},
		Peer: Peer(peer),
	}, nil
}

// FromMnemonic creates profile information from mnemonic.
func FromMnemonic(words []string, pass []byte, idx uint32) (Profile, error) {
	var m aezeed.Mnemonic

	copy(m[:], words)

	seed, err := m.ToCipherSeed(pass)
	if err != nil {
		return Profile{}, fmt.Errorf("failed to create seed: %w", err)
	}

	return FromSeed(seed.Entropy[:], idx)
}

// NewMnemonic creates a new random mnemonic.
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
