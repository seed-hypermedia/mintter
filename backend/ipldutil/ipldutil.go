// Package ipldutil provides utility functions for dealing with IPLD objects.
package ipldutil

import (
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-merkledag"

	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

func init() {
	format.Register(cid.DagProtobuf, merkledag.DecodeProtobufBlock)
	format.Register(cid.Raw, merkledag.DecodeRawBlock)
	format.Register(cid.DagCBOR, cbornode.DecodeBlock)
}
