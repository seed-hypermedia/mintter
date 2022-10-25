package vcs

import (
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs/hlc"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

// Change kinds.
const (
	ChangeKindV1 = "mintter.vcsdb.v1"
)

// ChangeType is the object type for Change.
const ChangeType ObjectType = "https://schema.mintter.org/Change"

func init() {
	cbornode.RegisterCborType(Change{})
	cbornode.RegisterCborType(ChangeBody{})
}

// ChangeInfo is the metadata of the Change.
type ChangeInfo struct {
	Object    cid.Cid        `refmt:"object"`
	Author    cid.Cid        `refmt:"author"` // TODO: should this be a DID instead?
	Parents   []cid.Cid      `refmt:"parents,omitempty"`
	Kind      string         `refmt:"kind"`
	Message   string         `refmt:"message,omitempty"`
	Time      hlc.Time       `refmt:"time"`             // Hybrid Logical Timestamp.
	Signer    cid.Cid        `refmt:"signer,omitempty"` // CID-formatter Libp2p key.
	Signature core.Signature `refmt:"signature,omitempty"`
}

// Change is the one of the foundational concepts of Mintter VCS.
// If a Permanode "instantiates" a Mintter Object, a Change mutates the corresponding object.
// Future changes depend on previous changes, forming a DAG (directed acyclic graph).
type Change struct {
	ChangeInfo
	Type ObjectType `refmt:"@type"`
	Body []byte     `refmt:"body"`
}

// Datoms returns the list of Datoms created by this Change.
func (ch Change) Datoms() ([]Datom, error) {
	if ch.Kind != ChangeKindV1 {
		return nil, fmt.Errorf("change kind %q is invalid", ch.Kind)
	}

	var cb ChangeBody
	if err := cbornode.DecodeInto(ch.Body, &cb); err != nil {
		return nil, fmt.Errorf("failed to decode datoms from change body: %w", err)
	}

	key, err := core.PublicKeyFromCID(ch.Signer)
	if err != nil {
		return nil, err
	}

	origin := key.Abbrev()

	out := make([]Datom, len(cb.Datoms))

	for i, d := range cb.Datoms {
		out[i] = Datom{
			Entity:    cb.Entities[d[1]],
			Attr:      cb.Attrs[d[2]],
			ValueType: ValueType(d[3]),
			Time:      int64(d[0]),
			Origin:    origin,
		}

		switch out[i].ValueType {
		case ValueTypeRef:
			out[i].Value = cb.Entities[d[4]]
		case ValueTypeString:
			out[i].Value = cb.Strings[d[4]]
		case ValueTypeInt:
			out[i].Value = d[4]
		case ValueTypeBool:
			switch d[4] {
			case 0:
				out[i].Value = false
			case 1:
				out[i].Value = true
			default:
				return nil, fmt.Errorf("bad boolean value: %v", d[4])
			}
		case ValueTypeBytes:
			out[i].Value = cb.Bytes[d[4]]
		case ValueTypeCID:
			out[i].Value = cb.CIDs[d[4]]
		default:
			return nil, fmt.Errorf("unsupported value type: %v", out[i].ValueType)
		}
	}

	return out, nil
}

// ChangeBody is the body of the Change.
type ChangeBody struct {
	Entities []NodeID    `refmt:"e,omitempty"`
	Strings  []string    `refmt:"s,omitempty"`
	Bytes    [][]byte    `refmt:"b,omitempty"`
	Attrs    []Attribute `refmt:"a,omitempty"`
	CIDs     []cid.Cid   `refmt:"c,omitempty"`
	Datoms   [][5]int    `refmt:"d"` // time, entity, attrIdx, valueType, stringIdx | entityIdx | bool | int
}

// Less defines total order among changes.
func (ch Change) Less(other Change) bool {
	if ch.Time.Equal(other.Time) {
		return ch.Signer.KeyString() < other.Signer.KeyString()
	}

	return ch.Time.Before(other.Time)
}

// Sign the change with a given key.
// The returned copy will contain the signature.
func (ch Change) Sign(k signer) Change {
	if !ch.Signer.Defined() {
		ch.Signer = k.CID()
	}

	if !ch.Signer.Equals(k.CID()) {
		panic("BUG: change signer doesn't match the provided key")
	}

	if ch.Signature != nil {
		panic("BUG: change is already signed")
	}

	sig, err := k.Sign(ch.signingBytes())
	if err != nil {
		panic(err)
	}

	ch.Signature = sig

	return ch
}

// Verify signature of a Change.
func (ch Change) Verify() error {
	pid, err := peer.FromCid(ch.Signer)
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

	return pk.Verify(ch.signingBytes(), ch.Signature)
}

type signer interface {
	core.Signer
	core.CIDer
}

func (ch Change) signingBytes() []byte {
	if !ch.Signer.Defined() {
		panic("BUG: signer is not defined")
	}
	ch.Signature = nil

	data, err := cbornode.DumpObject(ch)
	if err != nil {
		panic(err)
	}

	return data
}

// DecodeChange from its byte representation.
// It doesn't verify the signature, or anything else.
func DecodeChange(data []byte) (out Change, err error) {
	// Decode into tuple representation.
	// Process each datom.
	// Convert into datoms representation.
	// It's similar to json.RawMessage

	if err := cbornode.DecodeInto(data, &out); err != nil {
		return out, fmt.Errorf("failed to parse change data: %w", err)
	}

	return out, nil
}

// VerifiedChange is a change with a verified signature.
type VerifiedChange struct {
	blocks.Block

	Decoded Change
}

// VerifyChangeBlock ensures that a signature of a change IPLD block is valid.
func VerifyChangeBlock(blk blocks.Block) (vc VerifiedChange, err error) {
	c, err := DecodeChange(blk.RawData())
	if err != nil {
		return vc, err
	}

	if err := c.Verify(); err != nil {
		return vc, fmt.Errorf("failed to verify change %s: %w", blk.Cid(), err)
	}

	return VerifiedChange{Block: blk, Decoded: c}, nil
}
