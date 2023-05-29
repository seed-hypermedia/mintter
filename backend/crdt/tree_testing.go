package crdt

import (
	"testing"

	"github.com/stretchr/testify/require"
)

type TestPosition struct {
	Node   string
	Parent string
	Left   string
}

func NodePositionsTest(t *testing.T, want []TestPosition, it *TreeIterator) {
	t.Helper()
	var idx int
	for n := it.Next(); n != nil; n = it.Next() {
		t.Run(n.id, func(t *testing.T) {
			w := want[idx]
			idx++

			require.Equal(t, w.Node, n.id, "node id must match")
			require.Equal(t, w.Parent, n.pos.list.id, "parent must match")

			left := n.pos.PrevAlive()
			if left == nil && w.Left == "" {
				return
			}

			require.Equal(t, w.Left, n.pos.PrevAlive().value.(*TreeNode).id, "left id must match")
		})
	}

	require.Len(t, want, idx, "number of nodes doesn't match")
}
