package mttdoc

import (
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDocumentSmoke(t *testing.T) {
	doc := New(
		vcs.NewBatch(
			hlc.NewClock(), 123))

	require.True(t, doc.MoveBlock("b1", "", ""))
	require.False(t, doc.MoveBlock("b1", "", ""))
	require.False(t, doc.MoveBlock("b1", "", ""))
	require.Len(t, doc.dw.Dirty(), 4, doc.err)

	require.True(t, doc.MoveBlock("b2", "", "b1"))
	require.False(t, doc.MoveBlock("b2", "", "b1"))
	require.Len(t, doc.dw.Dirty(), 8, doc.err)

	require.True(t, doc.MoveBlock("b2", "b1", ""), doc.err)
	require.Len(t, doc.dw.Dirty(), 12, doc.err)

	require.NoError(t, doc.err)

	testHierarchy(t, []contentBlockPosition{
		{"b1", "$ROOT", ""},
		{"b2", "b1", ""},
	}, doc)
}

func TestMoveAncestor(t *testing.T) {
	batch := vcs.NewBatch(hlc.NewClock(), 123)
	doc := New(batch)

	require.True(t, doc.MoveBlock("b1", "", ""))
	require.True(t, doc.MoveBlock("b2", "", "b1"))
	require.True(t, doc.MoveBlock("b2", "b1", ""))
	require.False(t, doc.MoveBlock("b1", "b2", ""))
	require.Error(t, doc.err)

	require.Equal(t, 3*4, len(doc.dw.Dirty()))
}

func TestReplicate(t *testing.T) {
	doc := New(
		vcs.NewBatch(
			hlc.NewClock(), 123))

	/*
		- b1
		- b3
			- b2
			- b4
	*/
	require.True(t, doc.MoveBlock("b1", "", ""))
	require.True(t, doc.MoveBlock("b2", "", "b1"))
	require.True(t, doc.MoveBlock("b3", "", "b1"))
	require.True(t, doc.MoveBlock("b2", "b3", ""))
	require.True(t, doc.MoveBlock("b4", "b3", "b2"))
	require.Len(t, doc.dw.Dirty(), 5*4, doc.err)

	want := []contentBlockPosition{
		{"b1", "$ROOT", ""},
		{"b3", "$ROOT", "b1"},
		{"b2", "b3", ""},
		{"b4", "b3", "b2"},
	}

	testHierarchy(t, want, doc)

	r := New(
		vcs.NewBatch(
			hlc.NewClock(), 123))

	require.NoError(t, r.Replay(doc.dw.Dirty()))

	testHierarchy(t, want, r)
}

func TestDeleteBlock(t *testing.T) {
	doc := New(
		vcs.NewBatch(
			hlc.NewClock(), 123))

	/*
		- b1
		- b3
			x b2
			- b4
	*/
	require.True(t, doc.MoveBlock("b1", "", ""))
	require.True(t, doc.MoveBlock("b2", "", "b1"))
	require.True(t, doc.MoveBlock("b3", "", "b1"))
	require.True(t, doc.MoveBlock("b2", "b3", ""))
	require.True(t, doc.MoveBlock("b4", "b3", "b2"))
	require.True(t, doc.DeleteBlock("b2"), doc.err)
	require.Len(t, doc.dw.Dirty(), 6*4, doc.err)

	want := []contentBlockPosition{
		{"b1", "$ROOT", ""},
		{"b3", "$ROOT", "b1"},
		{"b4", "b3", ""},
	}

	testHierarchy(t, want, doc)
}

func TestComplexWithMove(t *testing.T) {
	t.Parallel()

	clock := hlc.NewClock()
	batch := vcs.NewBatch(clock, 123)

	doc := New(batch)

	doc.MoveBlock("b1", "", "")
	doc.MoveBlock("b1.1", "b1", "")
	doc.MoveBlock("b2", "", "")
	doc.MoveBlock("b1.1", "", "b2")
	doc.DeleteBlock("b1.1")

	require.NoError(t, doc.Err())

	r := New(vcs.NewBatch(hlc.NewClock(), 123))
	require.NoError(t, r.Replay(doc.dw.Dirty()))
}
