package backend

import (
	"crypto/rand"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"time"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(permanode{})
}

type signedPermanode struct {
	blk   blocks.Block
	perma permanode
}

func newSignedPermanode(codec uint64, aid AccountID, k core.KeyPair) (signedPermanode, error) {
	pn := newPermanode(aid)

	signed, err := SignCBOR(pn, k)
	if err != nil {
		return signedPermanode{}, err
	}

	blk := ipfs.NewBlock(codec, signed.data)

	return signedPermanode{
		blk:   blk,
		perma: pn,
	}, nil
}

// permanode can be used as a mutable reference for immutable data.
// This is inspired by Perkeep: https://perkeep.org/doc/schema/permanode.
// Signed permanodes are stored on IPFS, and their CIDs can be used as
// globally unique IDs for Mintter Objects.
// The random part of the permanode doesn't need to be very large, because
// signing the permanode will introduce enough entropy to the resulting ID.
type permanode struct {
	Random     []byte
	AccountID  cid.Cid
	CreateTime time.Time
}

func (p permanode) IsZero() bool {
	return len(p.Random) == 0 && p.CreateTime.IsZero()
}

func newPermanode(aid AccountID) permanode {
	var buf [10]byte
	n, err := rand.Read(buf[:])

	if err != nil {
		panic(err)
	}

	if n != len(buf) {
		panic("failed to create randomness")
	}

	return permanode{
		AccountID:  cid.Cid(aid),
		Random:     buf[:],
		CreateTime: nowTruncated(),
	}
}

func decodePermanodeBlock(blk blocks.Block) (permanode, error) {
	verified, err := SignedCBOR(blk.RawData()).Verify()
	if err != nil {
		return permanode{}, err
	}

	var perma permanode
	if err := cbornode.DecodeInto(verified.Payload, &perma); err != nil {
		return permanode{}, err
	}

	return perma, nil
}
