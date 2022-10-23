package vcs

import (
	"fmt"
	"mintter/backend/core"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

// ChangeType is the object type for Change.
const ChangeType ObjectType = "https://schema.mintter.org/Change"

func init() {
	cbornode.RegisterCborType(Change{})
}

// Change is the one of the foundational concepts of Mintter VCS.
// If a Permanode "instantiates" a Mintter Object, a Change mutates the corresponding object.
// Future changes depend on previous changes, forming a DAG (directed acyclic graph).
type Change struct {
	Type      ObjectType     `refmt:"@type"`
	Object    cid.Cid        `refmt:"object"`
	Author    cid.Cid        `refmt:"author"` // TODO: should this be a DID instead?
	Parents   []cid.Cid      `refmt:"parents,omitempty"`
	Kind      string         `refmt:"kind"`
	Body      []byte         `refmt:"body"`
	Message   string         `refmt:"message,omitempty"`
	Time      int64          `refmt:"time"`             // Hybrid Logical Timestamp.
	Signer    cid.Cid        `refmt:"signer,omitempty"` // CID-formatter Libp2p key.
	Signature core.Signature `refmt:"signature,omitempty"`
}

// Sign a prepared change and produce its copy with the produces signature.
func (c Change) Sign(k signer) Change {
	if !c.Signer.Defined() {
		c.Signer = k.CID()
	}

	if !c.Signer.Equals(k.CID()) {
		panic("BUG: change signer doesn't match the provided key")
	}

	if c.Signature != nil {
		panic("BUG: change is already signed")
	}

	sig, err := k.Sign(c.signingBytes())
	if err != nil {
		panic(err)
	}

	c.Signature = sig

	return c
}

// Verify signature of a Change.
func (c Change) Verify() error {
	pid, err := peer.FromCid(c.Signer)
	if err != nil {
		return err
	}

	key, err := pid.ExtractPublicKey()
	if err != nil {
		return fmt.Errorf("failed to extract public key for signer: %w", err)
	}

	pk, err := core.NewPublicKey(core.CodecDeviceKey, key.(*crypto.Ed25519PublicKey))
	if err != nil {
		return err
	}

	return pk.Verify(c.signingBytes(), c.Signature)
}

type signer interface {
	core.Signer
	core.CIDer
}

func (c Change) signingBytes() []byte {
	if !c.Signer.Defined() {
		panic("BUG: signer is not defined")
	}
	c.Signature = nil

	data, err := cbornode.DumpObject(c)
	if err != nil {
		panic(err)
	}

	return data
}

// DecodeChange from its byte representation.
// It doesn't verify the signature, or anything else.
func DecodeChange(data []byte) (out Change, err error) {
	if err := cbornode.DecodeInto(data, &out); err != nil {
		return out, fmt.Errorf("failed to parse change data: %w", err)
	}

	return out, nil
}
