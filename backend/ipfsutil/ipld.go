package ipfsutil

import (
	"time"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-merkledag"
	"github.com/polydawn/refmt/obj/atlas"

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
