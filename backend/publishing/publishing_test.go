package publishing

import (
	"encoding/json"
	"fmt"
	"testing"

	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multihash"
	"github.com/polydawn/refmt/obj/atlas"
	"github.com/stretchr/testify/require"
)

func init() {
	cbornode.RegisterCborType(signedNode{})

	cbornode.RegisterCborType(atlas.BuildEntry(cbornode.Node{}).Transform().
		TransformMarshal(atlas.MakeMarshalTransformFunc(
			func(v cbornode.Node) ([]byte, error) {
				return v.RawData(), nil
			})).
		TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(
			func(data []byte) (cbornode.Node, error) {
				n, err := cbornode.Decode(data, multihash.SHA2_256, -1)
				if err != nil {
					return cbornode.Node{}, err
				}
				return *n, nil
			})).
		Complete(),
	)
}

func TestSignature(t *testing.T) {
	s1 := Section{
		DocumentID:  "doc-1",
		Title:       "title-1",
		Description: "description-1",
		Author:      "author-1",
		Body:        "Hello world",
		// CreateTime:  time.Unix(1589365505, 0).UTC(),
		CreateTime: "2020-05-13T12:00:00Z",
	}

	node, err := cbornode.WrapObject(s1, multihash.SHA2_256, -1)
	require.NoError(t, err)

	sn, err := cbornode.WrapObject(signedNode{
		Node:      node,
		Signature: "deadbeef",
	}, multihash.SHA2_256, -1)
	require.NoError(t, err)

	data, err := json.Marshal(sn)

	require.NoError(t, err)

	fmt.Println(string(data))
}

type signedNode struct {
	Node      *cbornode.Node
	Signature string
}
