package vcsdb

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIndexedCache(t *testing.T) {
	var ic lookupTable[string]

	foo := ic.Put("foo")
	require.Equal(t, foo, ic.Put("foo"))
	require.Len(t, ic.lookup, 1)
	require.Len(t, ic.cache, 1)
}
