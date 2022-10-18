package vcs

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"time"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/multiformats/go-multibase"
)

type ObjectType string

const (
	ChangeType = "https://schema.mintter.org/Change"
	SignedType = "https://schema.mintter.org/SignedEnvelope"
)

func init() {
	cbornode.RegisterCborType(Change{})
	cbornode.RegisterCborType(SignedCBOR[Change]{})
}

type Change struct {
	Type   string  `refmt:"@type"`
	Object cid.Cid `refmt:"object"`
	// TODO: should this be a DID instead?
	Author      cid.Cid   `refmt:"author"` // account id.
	Parents     []cid.Cid `refmt:"parents,omitempty"`
	LamportTime uint64    `refmt:"lamportTime"`
	Kind        string    `refmt:"kind"`
	Body        []byte    `refmt:"body"`
	Message     string    `refmt:"message"`
	CreateTime  time.Time `refmt:"createTime"`
	// TODO: add proclamation or UCAN here.
}

type RecordedChange struct {
	ID cid.Cid

	Change
}

type SignedCBOR[T any] struct {
	// Fields are named this way to ensure that canonical sorting will sort them in this order.
	// Having payload size allows for efficient signature check with partial decoding.
	// CBOR is not very optimized for fast seeking, because nested structures are not byte-length prefixed.
	// Having payload size allows to skip the payload bytes entirely and extract the signature.

	Type        string         `refmt:"@type" cbor:"@type"`
	PayloadSize int            `refmt:"psize" cbor:"psize"`
	Payload     T              `refmt:"payload" cbor:"payload"`
	Signer      cid.Cid        `refmt:"signer" cbor:"signer"` // Libp2p key CID.
	Signature   core.Signature `refmt:"signature" cbor:"signature"`
}

func (s SignedCBOR[T]) Verify() error {
	// TODO: optimize this.
	// Avoid double serialization.
	// Simplify public key extraction.
	// Optionally take public key if we ever support non ed25519 keys that couldn't be inlined in CID.

	data, err := cbornode.DumpObject(s.Payload)
	if err != nil {
		return err
	}

	pid, err := peer.FromCid(s.Signer)
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

	return pk.Verify(data, s.Signature)
}

type signer interface {
	core.Signer
	core.CIDer
}

func NewSignedCBOR[T any](v T, s signer) (out SignedCBOR[T], err error) {
	data, err := cbornode.DumpObject(v)
	if err != nil {
		return out, err
	}

	sig, err := s.Sign(data)
	if err != nil {
		return out, err
	}

	out = SignedCBOR[T]{
		Type:        SignedType,
		PayloadSize: len(data),
		Payload:     v,
		Signature:   sig,
		Signer:      s.CID(),
	}

	return out, nil
}

func ParseChangeBlock(blk blocks.Block) (out SignedCBOR[Change], err error) {
	if err := cbornode.DecodeInto(blk.RawData(), &out); err != nil {
		return out, fmt.Errorf("failed to parse change block %s: %w", blk.Cid(), err)
	}

	return out, nil
}

func ParseChangeData(data []byte) (out SignedCBOR[Change], err error) {
	if err := cbornode.DecodeInto(data, &out); err != nil {
		return out, fmt.Errorf("failed to parse change data: %w", err)
	}

	return out, nil
}

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
