package ipfs

import (
	"github.com/ipfs/boxo/ipld/merkledag"
	"github.com/ipfs/go-cid"

	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

func init() {
	format.Register(cid.DagProtobuf, merkledag.DecodeProtobufBlock)
	format.Register(cid.Raw, merkledag.DecodeRawBlock)
	format.Register(cid.DagCBOR, cbornode.DecodeBlock)
}
