package slicex

import (
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMap(t *testing.T) {
	in := []int{1, 2, 3, 4, 5, 6, 7}
	want := []string{"1", "2", "3", "4", "5", "6", "7"}
	got := Map(in, strconv.Itoa)
	require.Equal(t, want, got)
}

func TestSet(t *testing.T) {
	in := []int{1, 2, 3, 4, 3, 7, 5, 5, 6, 7}
	want := MapSet[int]{
		1: {},
		2: {},
		3: {},
		4: {},
		5: {},
		6: {},
		7: {},
	}
	got := Set(in)
	require.Equal(t, want, got)
}
