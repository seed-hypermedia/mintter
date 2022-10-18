package vcs

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"mintter/backend/ipfs"
	"time"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multibase"
)

// ObjectType is a type for describing types of our IPLD data.
// Generally, IPLD data is a free-form JSON-like structure,
// which lacks the description of the logical "object" it represents.
// We borrow the idea of using a dedicated field `@type` from JSON-LD (linked data web standard)
// to hold a URL identifier which helps distinguishing between objects of different types.
type ObjectType string

// Version defines a version of a Mintter Object.
// It's a set of leaf nodes of the Time DAG.
type Version struct {
	totalCount uint64
	cids       []cid.Cid
}

func NewVersion(totalCount uint64, cc ...cid.Cid) Version {
	// TODO: sort and maybe copy the slice?

	return Version{
		totalCount: totalCount,
		cids:       cc,
	}
}

func ParseVersion(s string) (Version, error) {
	if s == "" {
		return Version{}, nil
	}

	_, data, err := multibase.Decode(s)
	if err != nil {
		return Version{}, fmt.Errorf("failed to decode version string: %w", err)
	}

	r := bytes.NewReader(data)

	count, err := binary.ReadUvarint(r)
	if err != nil {
		return Version{}, err
	}

	var cids []cid.Cid
	for {
		_, c, err := cid.CidFromReader(r)
		if err != nil && err != io.EOF {
			return Version{}, err
		}

		if err == io.EOF {
			break
		}

		cids = append(cids, c)
	}

	// TODO: check that sort is canonical

	return Version{
		totalCount: count,
		cids:       cids,
	}, nil
}

func (v Version) TotalCount() uint64 { return v.totalCount }

func (v Version) CIDs() []cid.Cid {
	if v.cids == nil {
		return nil
	}

	out := make([]cid.Cid, len(v.cids))
	copy(out, v.cids)
	return out
}

func (v Version) String() string {
	if v.cids == nil {
		return ""
	}

	if v.totalCount == 0 {
		panic("BUG: invalid version")
	}

	buf := make([]byte, binary.MaxVarintLen64)
	n := binary.PutUvarint(buf, v.totalCount)

	var b bytes.Buffer

	if _, err := b.Write(buf[:n]); err != nil {
		panic(err)
	}

	for _, c := range v.cids {
		_, err := c.WriteBytes(&b)
		if err != nil {
			panic(err)
		}
	}

	out, err := multibase.Encode(multibase.Base32, b.Bytes())
	if err != nil {
		panic(err)
	}

	return out
}

// IsZero checks if version is empty.
func (v Version) IsZero() bool {
	return v.cids == nil
}

// ObjectID is an ID of a Mintter Object in the VCS.
type ObjectID = cid.Cid

// BasePermanode is the simplest Permanode.
type BasePermanode struct {
	Type       ObjectType `refmt:"@type"`
	Owner      cid.Cid    `refmt:"owner"`
	CreateTime time.Time  `refmt:"createTime"`
}

// PermanodeType implements the Permanode interface.
func (b BasePermanode) PermanodeType() ObjectType { return b.Type }

// PermanodeOwner implements the Permanode interface.
func (b BasePermanode) PermanodeOwner() cid.Cid { return b.Owner }

// PermanodeCreateTime implements the Permanode interface.
func (b BasePermanode) PermanodeCreateTime() time.Time { return b.CreateTime }

func init() {
	cbornode.RegisterCborType(BasePermanode{})
}

// NewPermanode create a new base permanode.
func NewPermanode(ot ObjectType, owner cid.Cid, createTime time.Time) Permanode {
	return BasePermanode{
		Type:       ot,
		Owner:      owner,
		CreateTime: createTime,
	}
}

// Permanode is an interface for common Permanode fields.
type Permanode interface {
	PermanodeType() ObjectType
	PermanodeOwner() cid.Cid
	PermanodeCreateTime() time.Time
}

type EncodedBlock[T any] struct {
	blocks.Block
	Value T
}

func EncodeBlock[T any](v T) (EncodedBlock[T], error) {
	data, err := cbornode.DumpObject(v)
	if err != nil {
		return EncodedBlock[T]{}, err
	}

	blk := ipfs.NewBlock(cid.DagCBOR, data)

	return EncodedBlock[T]{
		Block: blk,
		Value: v,
	}, nil
}

type bstoreGetter struct {
	blockstore.Blockstore
}

func (b bstoreGetter) GetBlock(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	return b.Blockstore.Get(ctx, c)
}

type BlockGetter interface {
	GetBlock(context.Context, cid.Cid) (blocks.Block, error)
}

func LoadPermanode[P Permanode](ctx context.Context, bg BlockGetter, c cid.Cid) (out EncodedBlock[P], err error) {
	blk, err := bg.GetBlock(ctx, c)
	if err != nil {
		return out, err
	}

	if err := cbornode.DecodeInto(blk.RawData(), &out.Value); err != nil {
		return EncodedBlock[P]{}, err
	}

	out.Block = blk

	return out, nil
}
