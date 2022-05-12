package vcs

import (
	"fmt"
	"mintter/backend/ipfs"
	"testing"

	"github.com/ipfs/go-cid"
	multihash "github.com/multiformats/go-multihash/core"
	"github.com/polydawn/refmt/obj/atlas"
	"github.com/stretchr/testify/require"
)

func TestVersion(t *testing.T) {
	v, err := ParseVersion("")
	require.NoError(t, err)
	require.True(t, v.IsZero())

	cids := []cid.Cid{
		ipfs.MustNewCID(cid.Raw, multihash.IDENTITY, []byte("hello")),
		ipfs.MustNewCID(cid.Raw, multihash.IDENTITY, []byte("world")),
	}

	v = NewVersion(10, cids...)
	require.Equal(t, "bbiavkaafnbswy3dpafkqablxn5zgyza", v.String())

	v2, err := ParseVersion(v.String())
	require.NoError(t, err)
	require.Equal(t, v, v2)
	require.Equal(t, uint64(10), v.TotalCount())
	require.Equal(t, uint64(10), v2.TotalCount())
}

func TestSignedEnvelope(t *testing.T) {
	smap := atlas.BuildEntry(SignedCBOR[any]{}).StructMap().AutogenerateWithSortingScheme(atlas.KeySortMode_RFC7049).Complete().StructMap

	for _, f := range smap.Fields {
		fmt.Println(f.SerialName)
	}
}
