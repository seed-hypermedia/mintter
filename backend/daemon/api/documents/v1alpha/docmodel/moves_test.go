package docmodel

import (
	"fmt"
	"io"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/btree"
)

func TestIneffectualNestedMoves(t *testing.T) {
	state := newTreeCRDT()

	{
		mut := state.mutate()
		doMove(t, mut, moveEffectCreated, "b1", "", "")
		doMove(t, mut, moveEffectCreated, "b2", "", "b1")
		doMove(t, mut, moveEffectCreated, "b3", "", "b2")
		require.NoError(t, mut.commit("alice-1", 1, state))
	}

	{
		mut := state.mutate()
		checkTree(t, mut, [][2]string{
			{"", "b1"},
			{"", "b2"},
			{"", "b3"},
		})

		doMove(t, mut, moveEffectMoved, "b2", "b1", "")
		doMove(t, mut, moveEffectMoved, "b3", "b1", "b2")

		checkTree(t, mut, [][2]string{
			{"", "b1"},
			{"b1", "b2"},
			{"b1", "b3"},
		})
		require.Equal(t, []dirtyMove{
			{"b2", "b1", "", ""},
			{"b3", "b1", "b2", ""},
		}, mut.dirtyMoves())

		doMove(t, mut, moveEffectMoved, "b2", "", "b1")
		doMove(t, mut, moveEffectMoved, "b3", "", "b2")

		checkTree(t, mut, [][2]string{
			{"", "b1"},
			{"", "b2"},
			{"", "b3"},
		})
		require.Len(t, mut.dirtyMoves(), 0, "ineffectual moves must not be generated")
	}
}

func TestIneffectualMoveRestore(t *testing.T) {
	state := newTreeCRDT()

	{
		mut := state.mutate()
		doMove(t, mut, moveEffectCreated, "b1", "", "")
		doMove(t, mut, moveEffectCreated, "b2", "", "b1")
		doMove(t, mut, moveEffectCreated, "b3", "", "b2")
		doMove(t, mut, moveEffectCreated, "b4", "", "b3")
		require.NoError(t, mut.commit("alice-1", 1, state))
	}

	{
		mut := state.mutate()
		doMove(t, mut, moveEffectMoved, "b2", "", "")
		doMove(t, mut, moveEffectMoved, "b2", "", "b4")
		doMove(t, mut, moveEffectMoved, "b2", "", "b3")
		doMove(t, mut, moveEffectMoved, "b2", "", "b3")
		doMove(t, mut, moveEffectMoved, "b2", "", "")
		doMove(t, mut, moveEffectMoved, "b2", "", "b1")

		checkTree(t, mut, [][2]string{
			{"", "b1"},
			{"", "b2"},
			{"", "b3"},
			{"", "b4"},
		})

		require.Len(t, mut.dirtyMoves(), 0, "ineffectual moves must not be generated")
	}
}

func TestMoveSelection(t *testing.T) {
	state := newTreeCRDT()

	{
		mut := state.mutate()
		doMove(t, mut, moveEffectCreated, "b1", "", "")
		doMove(t, mut, moveEffectCreated, "b2", "", "b1")
		doMove(t, mut, moveEffectCreated, "b3", "", "b2")
		doMove(t, mut, moveEffectCreated, "b4", "", "b3")
		require.NoError(t, mut.commit("alice-1", 1, state))
	}

	checkTree(t, state.mutate(), [][2]string{
		{"", "b1"},
		{"", "b2"},
		{"", "b3"},
		{"", "b4"},
	})

	{
		mut := state.mutate()
		doMove(t, mut, moveEffectMoved, "b2", "", "")
		doMove(t, mut, moveEffectMoved, "b3", "", "b2")
		doMove(t, mut, moveEffectMoved, "b4", "", "b3")
		checkTree(t, mut, [][2]string{
			{"", "b2"},
			{"", "b3"},
			{"", "b4"},
			{"", "b1"},
		})

		wantMoves := []dirtyMove{
			{"b2", "", "", ""},
			{"b3", "", "b2", ""},
			{"b4", "", "b3", ""},
		}
		require.Equal(t, wantMoves, mut.dirtyMoves())
		require.NoError(t, mut.commit("alice-2", 2, state))
	}

	checkTree(t, state.mutate(), [][2]string{
		{"", "b2"},
		{"", "b3"},
		{"", "b4"},
		{"", "b1"},
	}, "state after commit must be the same")
}

func TestRedundantMoveMutation(t *testing.T) {
	state := newTreeCRDT()

	move := func(mut *treeMutation, want moveEffect, a, b, c string) {
		t.Helper()
		got, err := mut.move(a, b, c)
		require.NoError(t, err)
		require.Equal(t, want, got)
	}

	{
		mut := state.mutate()
		move(mut, moveEffectCreated, "b1", "", "")
		move(mut, moveEffectCreated, "b2", "", "b1")
		move(mut, moveEffectCreated, "b3", "", "b2")
		move(mut, moveEffectMoved, "b2", "", "b1")
		move(mut, moveEffectMoved, "b2", "", "b1")
		require.NoError(t, mut.commit("alice", 1, state))
	}

	alice := state.mutate()
	move(alice, moveEffectMoved, "b1", "b2", "")
	move(alice, moveEffectMoved, "b3", "b2", "b1")

	bob := state.mutate()
	move(bob, moveEffectMoved, "b2", "b1", "")
	move(bob, moveEffectMoved, "b3", "b1", "b2")
	move(bob, moveEffectCreated, "b4", "b1", "")
	move(bob, moveEffectMoved, "b4", TrashNodeID, "")

	require.NoError(t, alice.commit("alice-1", 2, state))
	require.NoError(t, bob.commit("bob", 2, state))

	checkTree(t, state.mutate(), [][2]string{
		{"", "b2"},
		{"b2", "b1"},
		{"b1", "b3"},
	})
}

func TestTreeState(t *testing.T) {
	ts := newTreeCRDT()

	require.NoError(t, ts.integrate(newOpID("a", 1, 0), "b1", "", "", ""))
	require.NoError(t, ts.integrate(newOpID("a", 2, 0), "b2", "", "b1", "a"))
	require.NoError(t, ts.integrate(newOpID("b", 3, 0), "b1", "", "b2", "a"))
}

func TestVisibleTree(t *testing.T) {
	state := newTreeCRDT()

	require.NoError(t, state.integrate(newOpID("a", 1, 0), "b1", "", "", ""))
	require.NoError(t, state.integrate(newOpID("a", 1, 1), "b2", "", "b1", "a"))
	require.NoError(t, state.integrate(newOpID("a", 1, 2), "b3", "", "b2", "a"))

	// Concurrent conflicting changes.

	require.NoError(t, state.integrate(newOpID("b", 2, 0), "b1", "b2", "", ""))
	require.NoError(t, state.integrate(newOpID("b", 2, 1), "b3", "b2", "b1", "b"))

	require.True(t, state.mutate().isAncestor("b2", "b1"))

	require.NoError(t, state.integrate(newOpID("c", 2, 0), "b2", "b1", "", ""))
	require.NoError(t, state.integrate(newOpID("c", 2, 1), "b3", "b1", "b2", "c"))

	checkTree(t, state.mutate(), [][2]string{
		{"", "b2"},
		{"b2", "b1"},
		{"b1", "b3"},
	})
}

type dirtyMove struct {
	Block      string
	Parent     string
	Left       string
	LeftOrigin string
}

func (mut *treeMutation) dirtyMoves() []dirtyMove {
	var out []dirtyMove
	mut.forEachMove(func(block, parent, left, leftOrigin string) bool {
		out = append(out, dirtyMove{
			Block:      block,
			Parent:     parent,
			Left:       left,
			LeftOrigin: leftOrigin,
		})
		return true
	})

	return out
}

func (mut *treeMutation) dump(w io.Writer) {
	if w == nil {
		w = os.Stdout
	}

	var hint btree.PathHint

	pivot := &move{Fracdex: "~"}

	var stack []*move

	addChild := func(block string) {
		pivot.Parent = block
		mut.tree.DescendHint(pivot, func(x *move) bool {
			if x == pivot {
				return true
			}

			if x.Parent != pivot.Parent {
				return false
			}

			if _, ok := mut.dirtyInvisibleMoves[x]; ok {
				return true
			}

			stack = append(stack, x)

			return true
		}, &hint)
	}

	addChild("")

	for len(stack) > 0 {
		i := len(stack) - 1
		x := stack[i]
		stack = stack[:i]

		fmt.Fprintln(w, x.Parent, x.Block)

		addChild(x.Block)
	}
}

func doMove(t *testing.T, mut *treeMutation, want moveEffect, block, parent, left string) {
	t.Helper()
	got, err := mut.move(block, parent, left)
	require.NoError(t, err)
	require.Equal(t, want, got)
}

func checkTree(t *testing.T, mut *treeMutation, want [][2]string, vv ...any) {
	t.Helper()

	var wb strings.Builder
	for _, x := range want {
		wb.WriteString(x[0])
		wb.WriteByte(' ')
		wb.WriteString(x[1])
		wb.WriteByte('\n')
	}

	var b strings.Builder
	mut.dump(&b)
	require.Equal(t, wb.String(), b.String(), vv...)
}
