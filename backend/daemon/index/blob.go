package index

import (
	"fmt"
	"seed/backend/pkg/must"
	"time"

	"github.com/fxamacker/cbor/v2"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	dagpb "github.com/ipld/go-codec-dagpb"
	"github.com/multiformats/go-multicodec"
)

var ProfileGenesisEpoch = must.Do2(time.ParseInLocation(time.RFC3339, "2024-01-01T00:00:00Z", time.UTC)).Unix()

const BlobTypeDagPB = "DagPB"

// Blob is a structural artifact.
type Blob struct {
	CID     cid.Cid
	Data    []byte
	Decoded any
}

func DecodeBlob(c cid.Cid, data []byte) (hb Blob, err error) {
	codec := c.Prefix().Codec

	switch multicodec.Code(codec) {
	case multicodec.DagPb:
		b := dagpb.Type.PBNode.NewBuilder()
		if err := dagpb.DecodeBytes(b, data); err != nil {
			return hb, fmt.Errorf("failed to decode dagpb node %s: %w", c, err)
		}

		hb.Decoded = b.Build()
	case multicodec.DagCbor:
		var v struct {
			Type string `cbor:"@type"`
		}
		if err := cbor.Unmarshal(data, &v); err != nil {
			return hb, fmt.Errorf("failed to infer hyper blob %s: %w", c, err)
		}

		switch BlobType(v.Type) {
		case BlobTypeChange:
			v := &Change{}
			if err := cbornode.DecodeInto(data, v); err != nil {
				return hb, err
			}
			hb.Decoded = v
		case BlobTypeRef:
			v := &Ref{}
			if err := cbornode.DecodeInto(data, v); err != nil {
				return hb, err
			}
			hb.Decoded = v
		default:
			return hb, fmt.Errorf("unknown hyper blob type: '%s'", v.Type)
		}
	default:
		return hb, fmt.Errorf("%s: %w", c, errNotHyperBlob)
	}

	hb.CID = c
	hb.Data = data

	return hb, nil
}
