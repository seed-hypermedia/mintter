package core

import (
	"crypto/rand"
	"encoding"
	"errors"
	"fmt"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/multiformats/go-multihash"
)

// Multicodecs.
const (
	CodecDeviceKey = cid.Libp2pKey
	// TODO: need to register this codec withing the multicodecs repo table.
	CodecAccountKey = 1091161161
)

// Ensure interface implementations.
var (
	_ Verifier                 = PublicKey{}
	_ encoding.BinaryMarshaler = PublicKey{}

	_ Signer = KeyPair{}
)

// Meaningful errors.
var (
	ErrBadSignature = errors.New("bad signature")
)

// Signer signs data and produces cryptographic signature.
type Signer interface {
	Sign([]byte) (Signature, error)
}

// CIDer provides CID of an object.
type CIDer interface {
	CID() cid.Cid
}

// Verifier checks that signature corresponds to the data.
type Verifier interface {
	Verify(data []byte, s Signature) error
}

// Signature is a cryptographic signature of some piece of data.
type Signature []byte

func (s Signature) verify(k crypto.PubKey, data []byte) error {
	ok, err := k.Verify(data, s)
	if err != nil {
		return fmt.Errorf("%s: %w", err, ErrBadSignature)
	}

	if !ok {
		return ErrBadSignature
	}

	return nil
}

// KeyID is an ID of a Public Key. It has
// identical semantics as Libp2p's Peer ID.
type KeyID = peer.ID

// PublicKey is the public part of a KeyPair.
type PublicKey struct {
	k     *crypto.Ed25519PublicKey
	id    KeyID
	codec uint64
}

// NewPublicKey creates a new public key from an existing Ed25519 public key.
func NewPublicKey(codec uint64, pub *crypto.Ed25519PublicKey) (pk PublicKey, err error) {
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		return pk, err
	}

	return PublicKey{
		k:     pub,
		id:    pid,
		codec: codec,
	}, nil
}

// ID of the public key.
func (pk PublicKey) ID() KeyID { return pk.id }

// CID returns CID representation of the public key.
func (pk PublicKey) CID() cid.Cid {
	mh, err := multihash.Cast([]byte(pk.id))
	if err != nil {
		panic(err)
	}

	return cid.NewCidV1(pk.codec, mh)
}

// Codec returns multicodec of the public key.
func (pk PublicKey) Codec() uint64 {
	return pk.codec
}

// Verify implements Verifier.
func (pk PublicKey) Verify(data []byte, s Signature) error {
	return s.verify(pk.k, data)
}

// MarshalBinary implements encoding.BinaryMarshaler.
func (pk PublicKey) MarshalBinary() ([]byte, error) {
	return crypto.MarshalPublicKey(pk.k)
}

type KeyPair struct {
	k *crypto.Ed25519PrivateKey

	PublicKey
}

func NewKeyPairRandom(codec uint64) (kp KeyPair, err error) {
	priv, _, err := crypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return kp, fmt.Errorf("failed to generate device private key: %w", err)
	}

	return NewKeyPair(codec, priv.(*crypto.Ed25519PrivateKey))
}

func NewKeyPair(codec uint64, priv *crypto.Ed25519PrivateKey) (kp KeyPair, err error) {
	pub, err := NewPublicKey(codec, priv.GetPublic().(*crypto.Ed25519PublicKey))
	if err != nil {
		return kp, err
	}

	return KeyPair{
		k:         priv,
		PublicKey: pub,
	}, nil
}

// Sign implements Signer.
func (kp KeyPair) Sign(data []byte) (Signature, error) {
	return kp.k.Sign(data)
}

// Wrapped returns the wrapped libp2p key.
func (pk KeyPair) Wrapped() crypto.PrivKey {
	return pk.k
}
