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

func TestBlockTree_CompressLocalMoves(t *testing.T) {
	tr := NewTree()

	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 0), "b1", "", ""))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 1), "b2", "", "b1@deadbeef"))
	require.True(t, tr.MustMoveRemote(NewOpID(1, "deadbeef", 2), "b3", "", "b2@deadbeef"))

	require.True(t, tr.MustMoveLocal(2, 0, "b1", "", "b3"))
	require.True(t, tr.MustMoveLocal(2, 1, "b1", "b3", ""))
	require.True(t, tr.MustMoveLocal(2, 2, "b4", "b3", "b1"))
	require.True(t, tr.MustMoveLocal(2, 3, "b1", "", ""))
	require.Len(t, tr.localMoves, 4)

	require.Equal(t, []string{"b4"}, tr.CompressLocalMoves())
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
