package vcs

import (
	"fmt"
	"mintter/backend/ipfs"
	"mintter/backend/vcs/hlc"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/polydawn/refmt/obj/atlas"
)

var hlcAtlas = atlas.BuildEntry(hlc.Time{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(t hlc.Time) (int64, error) {
		return t.Pack(), nil
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(in int64) (hlc.Time, error) {
		return hlc.Unpack(in), nil
	})).
	Complete()

func init() {
	cbornode.RegisterCborType(hlcAtlas)
}

// ObjectType is a type for describing types of our IPLD data.
// Generally, IPLD data is a free-form JSON-like structure,
// which lacks the description of the logical "object" it represents.
// We borrow the idea of using a dedicated field `@type` from JSON-LD (linked data web standard)
// to hold a URL identifier which helps distinguishing between objects of different types.
type ObjectType string

// BasePermanode is the simplest Permanode.
type BasePermanode struct {
	Type       ObjectType `refmt:"@type"`
	Owner      cid.Cid    `refmt:"owner"`
	CreateTime hlc.Time   `refmt:"createTime"`
}

// PermanodeType implements the Permanode interface.
func (b BasePermanode) PermanodeType() ObjectType { return b.Type }

// PermanodeOwner implements the Permanode interface.
func (b BasePermanode) PermanodeOwner() cid.Cid { return b.Owner }

// PermanodeCreateTime implements the Permanode interface.
func (b BasePermanode) PermanodeCreateTime() hlc.Time { return b.CreateTime }

func init() {
	cbornode.RegisterCborType(BasePermanode{})
}

// NewPermanode create a new base permanode.
func NewPermanode(ot ObjectType, owner cid.Cid, at hlc.Time) Permanode {
	return BasePermanode{
		Type:       ot,
		Owner:      owner,
		CreateTime: at,
	}
}

// Permanode is an interface for common Permanode fields.
type Permanode interface {
	PermanodeType() ObjectType
	PermanodeOwner() cid.Cid
	PermanodeCreateTime() hlc.Time
}

// EncodedPermanode is a Permanode encoded in a canonical form.
// The ID of the Permanode is the ID of a Mintter Object.
type EncodedPermanode struct {
	ID   cid.Cid
	Data []byte

	Permanode
}

// EncodePermanode encodes a given Permanode.
func EncodePermanode(p Permanode) (ep EncodedPermanode, err error) {
	data, err := cbornode.DumpObject(p)
	if err != nil {
		return ep, fmt.Errorf("failed to encode permanode: %w", err)
	}

	blk := ipfs.NewBlock(cid.DagCBOR, data)

	ep.ID = blk.Cid()
	ep.Data = blk.RawData()
	ep.Permanode = p

	return ep, nil
}
