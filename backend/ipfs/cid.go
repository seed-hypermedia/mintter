package ipfs

import (
	"encoding/binary"
	"fmt"

	"github.com/ipfs/go-cid"
	crypto "github.com/libp2p/go-libp2p/core/crypto"
	multihash "github.com/multiformats/go-multihash"
)

// NewCID creates a new CID from data.
func NewCID(codec, hashType uint64, data []byte) (cid.Cid, error) {
	mh, err := multihash.Sum(data, hashType, -1)
	if err != nil {
		return cid.Undef, err
	}

	return cid.NewCidV1(codec, mh), nil
}

// MustNewCID creates a new CID from data and panics if it fails.
func MustNewCID[T ~uint64](codec, hashType T, data []byte) cid.Cid {
	c, err := NewCID(uint64(codec), uint64(hashType), data)
	if err != nil {
		panic(err)
	}
	return c
}

// PubKeyAsCID encodes public key as CID.
func PubKeyAsCID(key crypto.PubKey) (cid.Cid, error) {
	_, ok := key.(*crypto.Ed25519PublicKey)
	if !ok {
		return cid.Undef, fmt.Errorf("only Ed25519 keys can be encoded as CIDs, got %T", key)
	}

	data, err := crypto.MarshalPublicKey(key)
	if err != nil {
		return cid.Undef, err
	}

	return NewCID(cid.Libp2pKey, multihash.IDENTITY, data)
}

// DecodeCID reads the CID multicodec and the multihash part of it.
func DecodeCID(c cid.Cid) (codec uint64, mh multihash.Multihash) {
	data := c.Bytes()

	if c.Version() == 0 {
		return cid.DagProtobuf, multihash.Multihash(data)
	}

	var pos int

	_, n := binary.Uvarint(data) // read CID version
	pos += n

	codec, n = binary.Uvarint(data[pos:])
	pos += n

	return codec, data[pos:]
}
