package crdt

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLWW(t *testing.T) {
	tests := []struct {
		In  []stringValue
		Out stringValue
	}{
		{
			In: []stringValue{
				{ID: ID{"a", 1}, Val: "A"},
				{ID: ID{"a", 2}, Val: "B"},
				{ID: ID{"a", 3}, Val: "C"},
				{ID: ID{"b", 1}, Val: "D"},
			},
			Out: stringValue{ID: ID{"a", 3}, Val: "C"},
		},
	}

	for _, tt := range tests {
		var lww stringLWW

		for _, v := range tt.In {
			lww.Set(v)
		}

		require.Equal(t, tt.Out, lww.Get())
	}
}
