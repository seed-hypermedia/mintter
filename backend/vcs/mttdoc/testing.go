package mttdoc

import (
	"testing"

	"github.com/stretchr/testify/require"
)

type contentBlockPosition struct {
	Block  string
	Parent string
	Left   string
}

func testHierarchy(t *testing.T, want []contentBlockPosition, doc *Document) {
	t.Helper()

	var idx int

	it := doc.Iterator()

	for el := it.Next(); el != nil; el = it.Next() {
		t.Run(el.Value().Block.String(), func(t *testing.T) {
			w := want[idx]
			idx++

			require.Equal(t, w.Block, el.Value().Block.String(), "node id must match")
			require.Equal(t, w.Parent, el.Value().Parent.String(), "parent must match")

			left := el.PrevAlive()
			if left == nil && w.Left == "" {
				return
			}

			require.Equal(t, w.Left, left.Value().Block.String(), "left block id must match")
		})
	}

	require.Len(t, want, idx, "number of blocks doesn't match")
}
