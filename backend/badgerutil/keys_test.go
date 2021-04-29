package badgerutil

import (
	"testing"

	"github.com/stretchr/testify/require"
)

var (
	testNS  = []byte("mtt")
	predFoo = []byte("foo")
)

func TestDataKey(t *testing.T) {
	k := dataKey(testNS, predFoo, 10)
	pk, err := ParseKey(testNS, k)
	require.NoError(t, err)

	require.Equal(t, PrefixDefault, pk.Prefix)
	require.Equal(t, KeyTypeData, pk.KeyType)
	require.Equal(t, predFoo, pk.Predicate)
	require.Equal(t, uint64(10), pk.UID)
	require.Nil(t, pk.Term)
}

func TestIndexKey(t *testing.T) {
	k := indexKey(testNS, predFoo, []byte("foo"))
	pk, err := ParseKey(testNS, k)
	require.NoError(t, err)

	require.Equal(t, PrefixDefault, pk.Prefix)
	require.Equal(t, KeyTypeIndex, pk.KeyType)
	require.Equal(t, predFoo, pk.Predicate)
	require.Equal(t, uint64(0), pk.UID)
	require.Equal(t, []byte("foo"), pk.Term)
}
