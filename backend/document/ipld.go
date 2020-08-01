package document

import (
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(opSet{})
	cbornode.RegisterCborType(operation{})
	cbornode.RegisterCborType(createDocument{})
	cbornode.RegisterCborType(createBlock{})
	cbornode.RegisterCborType(updateDocument{})
	cbornode.RegisterCborType(removeBlock{})
	cbornode.RegisterCborType(applyDelta{})
	cbornode.RegisterCborType(moveBlock{})
}

type opSet struct {
	Operations []operation
	Parent     cid.Cid `refmt:",omitempty"`
}
