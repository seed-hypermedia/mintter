package providing

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMerge(t *testing.T) {
	out := merge(context.Background(),
		makeSource(t, []string{"a", "b", "c"}),
		makeSource(t, []string{"a", "b", "c", "d"}),
		makeSource(t, []string{"b", "c", "f"}),
	)
	want := []string{"a", "a", "b", "b", "b", "c", "c", "c", "d", "f"}
	var i int
	for c := range out {
		require.Equalf(t, makeCID(t, want[i]), c, "don't match %d", i)
		i++
	}
}
