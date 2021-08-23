package badgergraph

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
			Key: dataKey("test", "follows", 125, 126),
			Want: parsedKey{
				Namespace:   "test",
				Predicate:   "follows",
				Subject:     125,
				KeyType:     keyTypeData,
				Cardinality: 126,
			},
		},
		{
			Key: indexKey("test", "content", []byte("term"), 125),
			Want: parsedKey{
				Namespace: "test",
				Predicate: "content",
				Subject:   125,
				Token:     []byte("term"),
				KeyType:   keyTypeIndex,
			},
		},
		{
			Key: reverseKey("test", "follows", 126, 125),
			Want: parsedKey{
				Namespace: "test",
				Predicate: "follows",
				Subject:   125,
				Object:    126,
				KeyType:   keyTypeReverse,
			},
		},
	}

	for _, tt := range tests {
		pk, err := parseKey("test", tt.Key)
		require.NoError(t, err)
		require.Equal(t, tt.Want, pk)
	}
}
