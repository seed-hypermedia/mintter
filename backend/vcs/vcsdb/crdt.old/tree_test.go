package crdt

import (
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"
)

type testWant struct {
	NodeID   string
	ParentID string
	LeftPos  OpID
	Pos      OpID
}

func testPlacement(t *testing.T, want []testWant, it *TreeIterator) {
	t.Helper()
	var idx int
	for blk := it.next(); blk != nil; blk = it.next() {
		t.Run(blk.id, func(t *testing.T) {
			w := want[idx]
			require.Equal(t, w.NodeID, blk.id, "node ids don't match")
			require.Equal(t, w.ParentID, blk.pos.list.id, "node lists don't match")
			require.Equal(t, w.Pos, blk.pos.id, "node current position doesn't match")
			require.Equal(t, w.LeftPos, blk.pos.left.id, "node left position doesn't match")
			idx++
		})
	}
	require.Equal(t, len(want), idx, "number of active nodes doesn't match")
}

func TestInsert(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", "b1", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b4", "b1", listStart))

	want := []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
		{"b4", "b1", listStart, d.nodes["b4"].pos.id},
		{"b3", "b1", d.nodes["b4"].pos.id, d.nodes["b3"].pos.id},
		{"b2", RootNodeID, d.nodes["b1"].pos.id, d.nodes["b2"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_Swap(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, listStart))

	want := []testWant{
		{"b2", RootNodeID, listStart, d.nodes["b2"].pos.id},
		{"b1", RootNodeID, d.nodes["b2"].pos.id, d.nodes["b1"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_ConcurrentCycle(t *testing.T) {
	for i, round := range []string{"NORMAL", "REVERSED"} {
		t.Run(round, func(t *testing.T) {
			d := NewTree(opidLess)
			vc := NewVectorClock()

			// Alice creates two nodes.
			require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
			b1 := d.nodes["b1"].pos

			require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, b1.id))
			b2 := d.nodes["b2"].pos

			require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", RootNodeID, b2.id))

			// Concurrently
			//   Alice moves 2 under 3
			//   Bob moves 3 under 2
			amvid := vc.NewID("alice")
			bmvid := vc.NewID("bob")

			if i == 0 {
				require.NoError(t, d.integrateMove(amvid, "b2", "b3", listStart))
				require.NoError(t, d.integrateMove(bmvid, "b3", "b2", listStart))
			} else {
				require.NoError(t, d.integrateMove(bmvid, "b3", "b2", listStart))
				require.NoError(t, d.integrateMove(amvid, "b2", "b3", listStart))
			}

			want := []testWant{
				{"b1", RootNodeID, listStart, b1.id},
				{"b3", RootNodeID, b2.id, d.nodes["b3"].pos.id},
				{"b2", "b3", listStart, d.nodes["b2"].pos.id},
			}

			testPlacement(t, want, d.Iterator())
		})
	}
}

func TestMove_CycleNestedSequential(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", "b1", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", "b2", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", "b3", listStart))

	want := []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
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
			d := NewTree(opidLess)
			vc := NewVectorClock()

			// Alice creates two nodes.
			require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
			require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, d.nodes["b1"].pos.id))
			require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", RootNodeID, d.nodes["b2"].pos.id))

			// Concurrently
			//   Alice moves b2 to the front.
			//   Bob moves b2 after b3.
			amvid := vc.NewID("alice")
			bmvid := vc.NewID("bob")

			b2 := d.nodes["b2"].pos
			b3 := d.nodes["b3"].pos

			if i == 0 {
				require.NoError(t, d.integrateMove(amvid, "b2", RootNodeID, listStart))
				require.NoError(t, d.integrateMove(bmvid, "b2", RootNodeID, b3.id))
			} else {
				require.NoError(t, d.integrateMove(bmvid, "b2", RootNodeID, b3.id))
				require.NoError(t, d.integrateMove(amvid, "b2", RootNodeID, listStart))
			}

			want := []testWant{
				{"b1", RootNodeID, amvid, d.nodes["b1"].pos.id},
				{"b3", RootNodeID, b2.id, d.nodes["b3"].pos.id},
				{"b2", RootNodeID, d.nodes["b3"].pos.id, bmvid},
			}

			testPlacement(t, want, d.Iterator())
		})
	}
}

func TestMove_OutdatedSuperseeding(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", RootNodeID, d.nodes["b2"].pos.id))

	b2 := d.nodes["b2"].pos
	b3 := d.nodes["b3"].pos

	bobMoveID := vc.NewID("bob") // Bob will create a moveOperation that would superseed the one from alice.

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b4", RootNodeID, b3.id))

	aliceMoveID := vc.NewID("alice")

	require.NoError(t, d.integrateMove(bobMoveID, "b2", "b3", listStart))
	require.NoError(t, d.integrateMove(aliceMoveID, "b3", "b2", listStart))

	want := []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
		{"b3", RootNodeID, b2.id, d.nodes["b3"].pos.id},
		{"b2", "b3", listStart, d.nodes["b2"].pos.id},
		{"b4", RootNodeID, b3.id, d.nodes["b4"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_Nested(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", "b1", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b4", "b1", listStart))

	b4old := d.nodes["b4"].pos

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b4", "b3", listStart))

	want := []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
		{"b3", "b1", b4old.id, d.nodes["b3"].pos.id},
		{"b4", "b3", listStart, d.nodes["b4"].pos.id},
		{"b2", RootNodeID, d.nodes["b1"].pos.id, d.nodes["b2"].pos.id},
	}

	testPlacement(t, want, d.Iterator())
}

func TestMove_Duplicate(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.Equal(t, 1, d.maxClock)
}

func TestDelete(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", RootNodeID, d.nodes["b1"].pos.id))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", "b1", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b4", "b1", listStart))

	b1BeforeMove := d.nodes["b1"].pos

	// Delete a subtree.
	require.NoError(t, d.DeleteNode(vc.NewID("alice"), "b1"))
	want := []testWant{
		{"b2", RootNodeID, b1BeforeMove.id, d.nodes["b2"].pos.id},
	}
	testPlacement(t, want, d.Iterator())

	// Resurrect a subtree.
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	want = []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
		{"b4", "b1", listStart, d.nodes["b4"].pos.id},
		{"b3", "b1", d.nodes["b4"].pos.id, d.nodes["b3"].pos.id},
		{"b2", RootNodeID, b1BeforeMove.id, d.nodes["b2"].pos.id},
	}
	testPlacement(t, want, d.Iterator())
}

func TestEmptyParent(t *testing.T) {
	t.Parallel()

	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.Error(t, d.MoveNode(vc.NewID("alice"), "b1", "", listStart))
}

func TestBadParent(t *testing.T) {
	t.Parallel()

	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.Error(t, d.MoveNode(vc.NewID("alice"), "b1", "missing-node-id", listStart))
}

func TestEmptyNodeID(t *testing.T) {
	t.Parallel()

	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.Error(t, d.MoveNode(vc.NewID("alice"), "", RootNodeID, listStart))
}

func TestUndoRedo(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b1", RootNodeID, listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b2", "b1", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b3", "b2", listStart))
	require.NoError(t, d.MoveNode(vc.NewID("alice"), "b4", "b2", d.nodes["b3"].pos.id))

	want := []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
		{"b2", "b1", listStart, d.nodes["b2"].pos.id},
		{"b3", "b2", listStart, d.nodes["b3"].pos.id},
		{"b4", "b2", d.nodes["b3"].pos.id, d.nodes["b4"].pos.id},
	}
	testPlacement(t, want, d.Iterator())

	for i := len(d.movesLog) - 1; i >= 1; i-- {
		d.undoMove(d.movesLog[i], i)
	}

	want = []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
	}
	testPlacement(t, want, d.Iterator())

	for i := 1; i < len(d.movesLog); i++ {
		require.NoError(t, d.redoMove(d.movesLog[i], i))
	}

	want = []testWant{
		{"b1", RootNodeID, listStart, d.nodes["b1"].pos.id},
		{"b2", "b1", listStart, d.nodes["b2"].pos.id},
		{"b3", "b2", listStart, d.nodes["b3"].pos.id},
		{"b4", "b2", d.nodes["b3"].pos.id, d.nodes["b4"].pos.id},
	}
	testPlacement(t, want, d.Iterator())
}

func TestSetNodePosition(t *testing.T) {
	d := NewTree(opidLess)
	vc := NewVectorClock()

	require.NoError(t, d.SetNodePosition(vc.NewID("alice"), "b1", RootNodeID, ""))
	require.Error(t, d.SetNodePosition(vc.NewID("alice"), "b1", "b3", ""))
	require.NoError(t, d.SetNodePosition(vc.NewID("alice"), "b2", RootNodeID, "b1"))
	require.Error(t, d.SetNodePosition(vc.NewID("bob"), "b3", "b1", "foo"), "must fail setting missing left sibling")
	require.NoError(t, d.SetNodePosition(vc.NewID("bob"), "b3", "b1", ""))

	NodePositionsTest(t, []TestPosition{
		{Node: "b1", Parent: RootNodeID, Left: ""},
		{Node: "b3", Parent: "b1", Left: ""},
		{Node: "b2", Parent: RootNodeID, Left: "b1"},
	}, d.Iterator())
}

func BenchmarkSetNodePosition_Append(b *testing.B) {
	for n := 0; n < b.N; n++ {
		d := NewTree(opidLess)
		vc := NewVectorClock()

		var left string

		for i := 0; i < 30; i++ {
			if i > 0 {
				left = strconv.Itoa(i)
			}
			require.NoError(b, d.SetNodePosition(vc.NewID("alice"), strconv.Itoa(i+1), RootNodeID, left))
		}
	}

	/*
		goos: darwin
		goarch: amd64
		pkg: mintter/backend/crdt
		cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
		BenchmarkTree
		BenchmarkTree-12    	   32510	     36392 ns/op	   18861 B/op	      88 allocs/op
		PASS
		ok  	mintter/backend/crdt	1.870s
	*/
}

func BenchmarkUndoRedo(b *testing.B) {
	for n := 0; n < b.N; n++ {
		d := NewTree(opidLess)
		vc := NewVectorClock()

		var left string

		for i := 0; i < 30; i++ {
			if i > 0 {
				left = strconv.Itoa(i)
			}
			require.NoError(b, d.SetNodePosition(vc.NewID("alice"), strconv.Itoa(i+1), RootNodeID, left))
		}

		for i := len(d.movesLog) - 1; i >= 0; i-- {
			d.undoMove(d.movesLog[i], i)
		}

		for i := 0; i < len(d.movesLog); i++ {
			require.NoError(b, d.redoMove(d.movesLog[i], i))
		}
	}

	/*
		goos: darwin
		goarch: amd64
		pkg: mintter/backend/crdt
		cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
		BenchmarkUndoRedo
		BenchmarkUndoRedo-12    	   28086	     40951 ns/op	   18865 B/op	      88 allocs/op
		PASS
		ok  	mintter/backend/crdt	1.781s
	*/
}

// VectorClock tracks IDs for each site and maximal
// lamport timestamp for the whole document.
type VectorClock struct {
	maxClock int
}

// NewVectorClock creates a new Frontier.
func NewVectorClock() *VectorClock {
	return &VectorClock{}
}

// NewID produces a new ID for a given site, without tracking it.
func (f *VectorClock) NewID(site string) OpID {
	id := makeOpID(site, f.maxClock+1)
	f.maxClock++
	return id
}
