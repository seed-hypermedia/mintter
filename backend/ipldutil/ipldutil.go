// Package ipldutil provides utility functions for dealing with IPLD objects.
package ipldutil

import (
	"bytes"
	"context"
	"time"

	"mintter/backend/identity"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-merkledag"
	"github.com/multiformats/go-multihash"
	"github.com/polydawn/refmt/obj/atlas"

	blocks "github.com/ipfs/go-block-format"
	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

var timeAtlas = atlas.BuildEntry(time.Time{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(t time.Time) (string, error) {
		return t.UTC().Format(time.RFC3339), nil
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(in string) (time.Time, error) {
		return time.ParseInLocation(time.RFC3339, in, time.UTC)
	})).
	Complete()

func init() {
	format.Register(cid.DagProtobuf, merkledag.DecodeProtobufBlock)
	format.Register(cid.Raw, merkledag.DecodeRawBlock)
	format.Register(cid.DagCBOR, cbornode.DecodeBlock)

	cbornode.RegisterCborType(timeAtlas)
}

type profileStore interface {
	CurrentProfile(context.Context) (identity.Profile, error)
	GetProfile(context.Context, identity.ProfileID) (identity.Profile, error)
}

// ReadSignedBlock decodes signed IPLD block.
func ReadSignedBlock(ctx context.Context, profstore profileStore, blk blocks.Block, v interface{}) error {
	var in signedIPLD

	if err := in.UnmarshalCBOR(bytes.NewReader(blk.RawData())); err != nil {
		return cbornode.NewSerializationError(err)
	}

	pid, err := identity.DecodeProfileID(in.Signer)
	if err != nil {
		return err
	}

	prof, err := profstore.GetProfile(ctx, pid)
	if err != nil {
		return err
	}

	if err := in.VerifySignature(prof.Account.PubKey); err != nil {
		return err
	}

	return cbornode.DecodeInto(in.Data, v)
}

// CreateSignedBlock creates a signed IPLD block.
func CreateSignedBlock(ctx context.Context, profstore profileStore, v interface{}) (blocks.Block, error) {
	const megabyte = 1048576

	prof, err := profstore.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	signed, err := signIPLD(v, prof)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	if err := signed.MarshalCBOR(&buf); err != nil {
		return nil, err
	}

	if buf.Len() > megabyte {
		// TODO: we hope to tackle this usecase before our end users hit this.
		panic("time has come, we have a block of more than 1 megabyte and we need to implement splitting it")
	}

	// Copy from go-ipld-cbor IpldStore.
	const (
		mhType = uint64(multihash.BLAKE2B_MIN + 31)
		mhLen  = -1
		codec  = uint64(cid.DagCBOR)
	)

	pref := cid.Prefix{
		Codec:    codec,
		MhType:   mhType,
		MhLength: mhLen,
		Version:  1,
	}

	c, err := pref.Sum(buf.Bytes())
	if err != nil {
		return nil, err
	}

	return blocks.NewBlockWithCid(buf.Bytes(), c)
}
