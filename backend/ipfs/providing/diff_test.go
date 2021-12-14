package providing

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDiff(t *testing.T) {
	tests := []struct {
		All    []string
		Subset []string
		Want   []string
	}{
		{
			All:    []string{"a", "b", "c", "d", "e"},
			Subset: []string{"a", "b", "c", "d", "e"},
		},
		{
			All:    []string{"a", "b", "c", "d", "e"},
			Subset: []string{"c"},
			Want:   []string{"a", "b", "d", "e"},
		},
		{
			All:    []string{"a", "b", "c", "d", "e"},
			Subset: []string{"a", "c"},
			Want:   []string{"b", "d", "e"},
		},
		{
			All:    []string{"a", "b", "c", "d", "e"},
			Subset: []string{"a", "b", "c", "d"},
			Want:   []string{"e"},
		},
	}

	for _, tt := range tests {
		out := diff(context.Background(), makeSource(t, tt.All), makeSource(t, tt.Subset))
		var i int
		for c := range out {
			require.Equal(t, makeCID(t, tt.Want[i]), c)
			i++
		}
	}
}
