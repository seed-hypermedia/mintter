package vcs

import (
	"mintter/backend/ipfs"
	"testing"

	"github.com/ipfs/go-cid"
	multihash "github.com/multiformats/go-multihash/core"
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

	v = NewVersion(cids...)
	require.Equal(t, "baiavkaafnbswy3dpafkqablxn5zgyza", v.String())

	v2, err := ParseVersion(v.String())
	require.NoError(t, err)
	require.Equal(t, v, v2)
	require.Equal(t, 2, v.Len())
	require.Equal(t, 2, v2.Len())
}
