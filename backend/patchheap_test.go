package backend

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPatchHeap(t *testing.T) {
	arr := [][]Patch{
		{{LamportTime: 3}},
		{{LamportTime: 2}, {LamportTime: 6}, {LamportTime: 12}},
		{{LamportTime: 1}, {LamportTime: 9}, {LamportTime: 3000}},
		{{LamportTime: 23}, {LamportTime: 34}, {LamportTime: 90}, {LamportTime: 2000}},
	}

	expected := []uint64{1, 2, 3, 6, 9, 12, 23, 34, 90, 2000, 3000}

	for i, p := range mergePatches(arr) {
		require.Equal(t, expected[i], p.LamportTime)
	}
}
