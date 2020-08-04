// Package ipldutil provides utility functions for dealing with IPLD objects.
package ipldutil

import (
	"bytes"
	"context"

	"mintter/backend/identity"
	"mintter/backend/ipfsutil"

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

// GetSignedRecord using the provided block getter. The signature will be verified using the underlying profile store.
func GetSignedRecord(ctx context.Context, getter ipfsutil.BlockGetter, profstore profileStore, c cid.Cid, v interface{}) error {
	blk, err := getter.GetBlock(ctx, c)
	if err != nil {
		return err
	}

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

// PutSignedRecord will sign the provided value using the current profile and the provided block putter.
func PutSignedRecord(ctx context.Context, putter ipfsutil.BlockPutter, profstore profileStore, v interface{}) (cid.Cid, error) {
	prof, err := profstore.CurrentProfile(ctx)
	if err != nil {
		return cid.Undef, err
	}

	signed, err := signIPLD(v, prof)
	if err != nil {
		return cid.Undef, err
	}

	var buf bytes.Buffer
	if err := signed.MarshalCBOR(&buf); err != nil {
		return cid.Undef, err
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
		return cid.Undef, err
	}

	blk, err := blocks.NewBlockWithCid(buf.Bytes(), c)
	if err != nil {
		return cid.Undef, err
	}

	if err := putter.Put(blk); err != nil {
		return cid.Undef, err
	}

	return blk.Cid(), nil
}
