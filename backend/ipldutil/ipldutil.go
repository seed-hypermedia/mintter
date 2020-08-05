// Package ipldutil provides utility functions for dealing with IPLD objects.
package ipldutil

import (
	"bytes"
	"context"

	"mintter/backend/identity"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-merkledag"
	"github.com/multiformats/go-multihash"

	blocks "github.com/ipfs/go-block-format"
	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

func init() {
	format.Register(cid.DagProtobuf, merkledag.DecodeProtobufBlock)
	format.Register(cid.Raw, merkledag.DecodeRawBlock)
	format.Register(cid.DagCBOR, cbornode.DecodeBlock)
}

type profileStore interface {
	CurrentProfile(context.Context) (identity.Profile, error)
	GetProfile(context.Context, identity.ProfileID) (identity.Profile, error)
}

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

func CreateSignedBlock(ctx context.Context, profstore profileStore, v interface{}) (blocks.Block, error) {
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
