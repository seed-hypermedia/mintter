package documents

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBlockTree_MustMoveRemoteAlways(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deafbeef", 1), "b1", "", ""))
}

func TestBlockTree_DuplicateOpID(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.Panics(t, func() { tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b2", "", "") })
}

func TestBlockTree_MustUseShadowID(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.Panics(t, func() { tr.MustMoveRemote(NewOpID(1, "deadbeef", 1), "b2", "", "b1") })
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 2), "b2", "", "b1@deadbeef"))
}

func TestBlockTree_Nesting(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 1), "b2", "b1", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 2), "b3", "b2", ""))
}

func TestBlockTree_OnlyOneMovePerOrigin(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 1), "b2", "", ""))
	require.Panics(t, func() { tr.MustMoveRemote(NewOpID(1, "deadbeef", 2), "b1", "", "b2@deadbeef") })
}

func TestBlockTree_LocalMovesAvoidRedundant(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveLocal(1, 0, "b1", "", ""))
	require.True(t, tr.MustMoveLocal(1, 1, "b2", "", ""))
	require.False(t, tr.MustMoveLocal(1, 2, "b2", "", ""))
}

func TestBlockTree_LocalMovesNesting(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveLocal(1, 0, "b1", "", ""))
	require.True(t, tr.MustMoveLocal(1, 1, "b2", "b1", ""))
	require.True(t, tr.MustMoveLocal(1, 2, "b3", "b2", ""))
	require.True(t, tr.MustMoveLocal(1, 3, "b4", "b2", "b3"))
}

func TestBlockTree_CyclesRemote(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 1), "b2", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 2), "b3", "b2", ""))

	// Produce cycle
	require.False(t, tr.MustMoveRemote(NewOpID(2, "deafbeef", 0), "b2", "b3", ""))
}

func TestBlockTree_CyclesLocal(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 1), "b2", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 2), "b3", "b2", ""))

	// Produce cycle
	require.Panics(t, func() { tr.MustMoveLocal(2, 0, "b2", "b3", "") })
}

func TestBlockTree_Iterator(t *testing.T) {
	tr := NewTree()

	// - b1
	// - b3
	//   - b4
	//   - b5
	//   	- b8
	//   	- b6
	// 		- b7
	// - b9
	require.True(t, tr.MustMoveLocal(1, 0, "b1", "", ""))
	require.True(t, tr.MustMoveLocal(1, 1, "b2", "", "b1"))
	require.True(t, tr.MustMoveLocal(1, 2, "b3", "", "b2"))
	require.True(t, tr.MustMoveLocal(1, 3, "b2", TrashNodeID, ""))
	require.True(t, tr.MustMoveLocal(1, 4, "b4", "b3", ""))
	require.True(t, tr.MustMoveLocal(1, 5, "b5", "b3", "b4"))
	require.True(t, tr.MustMoveLocal(1, 6, "b6", "b5", ""))
	require.True(t, tr.MustMoveLocal(1, 7, "b7", "b5", "b6"))
	require.True(t, tr.MustMoveLocal(1, 8, "b8", "b5", ""))
	require.True(t, tr.MustMoveLocal(1, 9, "b9", "", "b3"))

	it := tr.Iterator()

	want := [][2]string{
		{"b1", ""},
		{"b3", ""},
		{"b4", "b3"},
		{"b5", "b3"},
		{"b8", "b5"},
		{"b6", "b5"},
		{"b7", "b5"},
		{"b9", ""},
	}

	var got [][2]string
	for node := it.Next(); node != nil; node = it.Next() {
		got = append(got, [2]string{node.id, node.pos.Value.(ShadowPosition).parent})
	}
	require.Equal(t, want, got)
}
