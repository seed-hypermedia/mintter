package vcs

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"time"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multibase"
)

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

	Type        string         `refmt:"@type"`
	PayloadSize int            `refmt:"psize"`
	Payload     T              `refmt:"payload"`
	Signer      cid.Cid        `refmt:"signer"` // Libp2p key CID.
	Signature   core.Signature `refmt:"signature"`
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

// Version defines a version of a Mintter Object.
// It's a set of leaf nodes of the Time DAG.
type Version struct {
	totalCount uint64
	cids       []cid.Cid
}

func NewVersion(totalCount uint64, cc ...cid.Cid) Version {
	if len(cc) > 0 && totalCount == 0 {
		panic("BUG: invalid version")
	}

	// TODO: sort and maybe copy the slice?

	return Version{
		totalCount: totalCount,
		cids:       cc,
	}
}

func DecodeVersion(s string) (Version, error) {
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

// WorkingCopy is a dirty mutable copy of a Mintter Object.
type WorkingCopy struct {
	etag       string
	oid        ObjectID
	name       string
	ver        Version
	data       []byte
	createTime time.Time
	updateTime time.Time
}

// NewWorkingCopy creates a new clean working copy.
func NewWorkingCopy(objectID ObjectID, name string) WorkingCopy {
	now := time.Now().UTC().Round(time.Second)

	return WorkingCopy{
		oid:        objectID,
		name:       name,
		createTime: now,
		updateTime: now,
	}
}

// Version returns the version of the working copy.
func (wc *WorkingCopy) Version() Version { return wc.ver }

// Data returns the data of the working copy.
func (wc *WorkingCopy) Data() []byte { return wc.data }

// SetData mutates the working copy data.
func (wc *WorkingCopy) SetData(data []byte) {
	if wc.createTime.IsZero() {
		panic("BUG: using invalid working copy")
	}

	wc.data = data
	wc.updateTime = time.Now().UTC().Round(time.Second)
}

// UpdateTime returns the time of the last update.
func (wc *WorkingCopy) UpdateTime() time.Time { return wc.updateTime }

type BasePermanode struct {
	Type       string
	Owner      cid.Cid
	CreateTime time.Time
}

func (b BasePermanode) PermanodeType() string          { return b.Type }
func (b BasePermanode) PermanodeOwner() cid.Cid        { return b.Owner }
func (b BasePermanode) PermanodeCreateTime() time.Time { return b.CreateTime }

func init() {
	cbornode.RegisterCborType(BasePermanode{})
}

type Permanode interface {
	PermanodeType() string
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
