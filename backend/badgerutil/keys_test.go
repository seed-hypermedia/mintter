package badgerutil

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestKeys(t *testing.T) {
	tests := []struct {
		Key  []byte
		Want parsedKey
	}{
		{
			Key: dataKey("test", "follows", 125, 126, 127),
			Want: parsedKey{
				Namespace: "test",
				Predicate: "follows",
				Subject:   125,
				KeyType:   KeyTypeData,
				Ts:        126,
				Idx:       127,
			},
		},
		{
			Key: indexKey("test", "content", []byte("term"), 125, 126, 127),
			Want: parsedKey{
				Namespace: "test",
				Predicate: "content",
				Subject:   125,
				Token:     []byte("term"),
				KeyType:   KeyTypeIndex,
				Ts:        126,
				Idx:       127,
			},
		},
		{
			Key: reverseKey("test", "follows", 126, 125, 127, 128),
			Want: parsedKey{
				Namespace: "test",
				Predicate: "follows",
				Subject:   125,
				Object:    126,
				KeyType:   KeyTypeReverse,
				Ts:        127,
				Idx:       128,
			},
		},
	}

	for _, tt := range tests {
		pk, err := parseKey("test", tt.Key)
		require.NoError(t, err)
		require.Equal(t, tt.Want, pk)
	}
}
