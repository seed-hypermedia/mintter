package providing

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDedupe(t *testing.T) {
	tests := []struct {
		In  []string
		Out []string
	}{
		{
			In:  []string{"a", "a", "a", "b", "b", "b", "c", "d", "e"},
			Out: []string{"a", "b", "c", "d", "e"},
		},
	}

	for _, tt := range tests {
		out := dedupe(context.Background(), makeSource(t, tt.In))
		var i int
		for c := range out {
			require.Equal(t, makeCID(t, tt.Out[i]), c)
			i++
		}
	}
}
