package crdt

import (
	"testing"

	"github.com/stretchr/testify/require"
)

type testWant struct {
	NodeID   string
	ParentID string
	LeftPos  ID
	Pos      ID
}

func testPlacement(t *testing.T, want []testWant, it *TreeIterator) {
	t.Helper()
	var idx int
	for blk := it.Next(); blk != nil; blk = it.Next() {
		w := want[idx]
		require.Equal(t, w.NodeID, blk.id, "node ids don't match %s", w.NodeID)
		require.Equal(t, w.ParentID, blk.pos.list.id, "node lists don't match %s", w.NodeID)
		require.Equal(t, w.Pos, blk.pos.id, "node current position doesn't match %s", w.NodeID)
		require.Equal(t, w.LeftPos, blk.pos.left.id, "node left position doesn't match %s", w.NodeID)
		idx++
	}
	require.Equal(t, len(want), idx, "number of active nodes doesn't match")
}

func TestInsert(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode("alice", "b3", "b1", listStart))
	require.NoError(t, d.MoveNode("alice", "b4", "b1", listStart))

	want := []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b4", "b1", listStart, d.nodes["b4"].pos.id},
		{"b3", "b1", d.nodes["b4"].pos.id, d.nodes["b3"].pos.id},
		{"b2", RootSubtree, d.nodes["b1"].pos.id, d.nodes["b2"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_Swap(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, listStart))

	want := []testWant{
		{"b2", RootSubtree, listStart, d.nodes["b2"].pos.id},
		{"b1", RootSubtree, d.nodes["b2"].pos.id, d.nodes["b1"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_ConcurrentCycle(t *testing.T) {
	for i, round := range []string{"NORMAL", "REVERSED"} {
		t.Run(round, func(t *testing.T) {
			d := NewTree(NewFrontier())

			// Alice creates two nodes.
			require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
			b1 := d.nodes["b1"].pos

			require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, b1.id))
			b2 := d.nodes["b2"].pos

			require.NoError(t, d.MoveNode("alice", "b3", RootSubtree, b2.id))

			// Concurrently
			//   Alice moves 2 under 3
			//   Bob moves 3 under 2
			amvid := d.newID("alice")
			bmvid := d.newID("bob")

			if i == 0 {
				require.NoError(t, d.integrateMove(amvid, "b2", "b3", listStart))
				require.NoError(t, d.integrateMove(bmvid, "b3", "b2", listStart))
			} else {
				require.NoError(t, d.integrateMove(bmvid, "b3", "b2", listStart))
				require.NoError(t, d.integrateMove(amvid, "b2", "b3", listStart))
			}

			want := []testWant{
				{"b1", RootSubtree, listStart, b1.id},
				{"b3", RootSubtree, b2.id, d.nodes["b3"].pos.id},
				{"b2", "b3", listStart, d.nodes["b2"].pos.id},
			}

			testPlacement(t, want, d.Iterator())
		})
	}
}

func TestMove_CycleNestedSequential(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", "b1", listStart))
	require.NoError(t, d.MoveNode("alice", "b3", "b2", listStart))
	require.NoError(t, d.MoveNode("alice", "b1", "b3", listStart))

	want := []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b2", "b1", listStart, d.nodes["b2"].pos.id},
		{"b3", "b2", listStart, d.nodes["b3"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_ConcurrentCommute(t *testing.T) {
	// Moving same node concurrently must chose the latest position,
	// if it's a valid position. And it must commute.

	for i, round := range []string{"NORMAL", "REVERSED"} {
		t.Run(round, func(t *testing.T) {
			d := NewTree(NewFrontier())

			// Alice creates two nodes.
			require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
			require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, d.nodes["b1"].pos.id))
			require.NoError(t, d.MoveNode("alice", "b3", RootSubtree, d.nodes["b2"].pos.id))

			// Concurrently
			//   Alice moves b2 to the front.
			//   Bob moves b2 after b3.
			amvid := d.newID("alice")
			bmvid := d.newID("bob")

			b2 := d.nodes["b2"].pos
			b3 := d.nodes["b3"].pos

			if i == 0 {
				require.NoError(t, d.integrateMove(amvid, "b2", RootSubtree, listStart))
				require.NoError(t, d.integrateMove(bmvid, "b2", RootSubtree, b3.id))
			} else {
				require.NoError(t, d.integrateMove(bmvid, "b2", RootSubtree, b3.id))
				require.NoError(t, d.integrateMove(amvid, "b2", RootSubtree, listStart))
			}

			want := []testWant{
				{"b1", RootSubtree, amvid, d.nodes["b1"].pos.id},
				{"b3", RootSubtree, b2.id, d.nodes["b3"].pos.id},
				{"b2", RootSubtree, d.nodes["b3"].pos.id, bmvid},
			}

			testPlacement(t, want, d.Iterator())
		})
	}
}

func TestMove_OutdatedSuperseeding(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode("alice", "b3", RootSubtree, d.nodes["b2"].pos.id))

	b2 := d.nodes["b2"].pos
	b3 := d.nodes["b3"].pos

	bobMoveID := d.newID("bob") // Bob will create a moveOperation that would superseed the one from alice.

	require.NoError(t, d.MoveNode("alice", "b4", RootSubtree, b3.id))

	aliceMoveID := d.newID("alice")

	require.NoError(t, d.integrateMove(bobMoveID, "b2", "b3", listStart))
	require.NoError(t, d.integrateMove(aliceMoveID, "b3", "b2", listStart))

	want := []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b3", RootSubtree, b2.id, d.nodes["b3"].pos.id},
		{"b2", "b3", listStart, d.nodes["b2"].pos.id},
		{"b4", RootSubtree, b3.id, d.nodes["b4"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_Nested(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode("alice", "b3", "b1", listStart))
	require.NoError(t, d.MoveNode("alice", "b4", "b1", listStart))

	b4old := d.nodes["b4"].pos

	require.NoError(t, d.MoveNode("alice", "b4", "b3", listStart))

	want := []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b3", "b1", b4old.id, d.nodes["b3"].pos.id},
		{"b4", "b3", listStart, d.nodes["b4"].pos.id},
		{"b2", RootSubtree, d.nodes["b1"].pos.id, d.nodes["b2"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestDelete(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", RootSubtree, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode("alice", "b3", "b1", listStart))
	require.NoError(t, d.MoveNode("alice", "b4", "b1", listStart))

	b1BeforeMove := d.nodes["b1"].pos

	// Delete a subtree.
	require.NoError(t, d.DeleteNode("alice", "b1"))
	want := []testWant{
		{"b2", RootSubtree, b1BeforeMove.id, d.nodes["b2"].pos.id},
	}
	testPlacement(t, want, d.Iterator())

	// Resurrect a subtree.
	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	want = []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b4", "b1", listStart, d.nodes["b4"].pos.id},
		{"b3", "b1", d.nodes["b4"].pos.id, d.nodes["b3"].pos.id},
		{"b2", RootSubtree, b1BeforeMove.id, d.nodes["b2"].pos.id},
	}
	testPlacement(t, want, d.Iterator())
}

func TestEmptyParent(t *testing.T) {
	t.Parallel()

	d := NewTree(NewFrontier())

	require.Error(t, d.MoveNode("alice", "b1", "", listStart))
}

func TestBadParent(t *testing.T) {
	t.Parallel()

	d := NewTree(NewFrontier())

	require.Error(t, d.MoveNode("alice", "b1", "missing-node-id", listStart))
}

func TestEmptyNodeID(t *testing.T) {
	t.Parallel()

	d := NewTree(NewFrontier())

	require.Error(t, d.MoveNode("alice", "", RootSubtree, listStart))
}

func TestUndoRedo(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.MoveNode("alice", "b1", RootSubtree, listStart))
	require.NoError(t, d.MoveNode("alice", "b2", "b1", listStart))
	require.NoError(t, d.MoveNode("alice", "b3", "b2", listStart))
	require.NoError(t, d.MoveNode("alice", "b4", "b2", d.nodes["b3"].pos.id))

	want := []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b2", "b1", listStart, d.nodes["b2"].pos.id},
		{"b3", "b2", listStart, d.nodes["b3"].pos.id},
		{"b4", "b2", d.nodes["b3"].pos.id, d.nodes["b4"].pos.id},
	}
	testPlacement(t, want, d.Iterator())

	for i := len(d.movesLog) - 1; i >= 1; i-- {
		d.undoMove(d.movesLog[i], i)
	}

	want = []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
	}
	testPlacement(t, want, d.Iterator())

	for i := 1; i < len(d.movesLog); i++ {
		d.redoMove(d.movesLog[i], i)
	}

	want = []testWant{
		{"b1", RootSubtree, listStart, d.nodes["b1"].pos.id},
		{"b2", "b1", listStart, d.nodes["b2"].pos.id},
		{"b3", "b2", listStart, d.nodes["b3"].pos.id},
		{"b4", "b2", d.nodes["b3"].pos.id, d.nodes["b4"].pos.id},
	}
	testPlacement(t, want, d.Iterator())
}

func TestSetNodePosition(t *testing.T) {
	d := NewTree(NewFrontier())

	require.NoError(t, d.SetNodePosition("alice", "b1", RootSubtree, ""))
	require.Error(t, d.SetNodePosition("alice", "b1", "b3", ""))
	require.NoError(t, d.SetNodePosition("alice", "b2", RootSubtree, "b1"))
}
