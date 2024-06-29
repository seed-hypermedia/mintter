package docmodel

import (
	"fmt"

	"github.com/tidwall/btree"
	"golang.org/x/exp/maps"
	"roci.dev/fracdex"
)

type moveEffect byte

const (
	moveEffectNone    moveEffect = 0
	moveEffectCreated moveEffect = 1
	moveEffectMoved   moveEffect = 2
)

const TrashNodeID = "◊"

type opID struct {
	Origin string
	Ts     int64
	Idx    int
}

func newOpID(origin string, ts int64, idx int) opID {
	return opID{
		Origin: origin,
		Ts:     ts,
		Idx:    idx,
	}
}

func (o opID) Less(oo opID) bool {
	if o.Ts < oo.Ts {
		return true
	}

	if o.Ts > oo.Ts {
		return false
	}

	if o.Origin < oo.Origin {
		return true
	}

	if o.Origin > oo.Origin {
		return false
	}

	if o.Idx == oo.Idx {
		panic("BUG: duplicate move")
	}

	return o.Idx < oo.Idx
}

type treeCRDT struct {
	log     *btree.BTreeG[*move]
	logHint btree.PathHint

	tree     *btree.BTreeG[*move]
	treeHint btree.PathHint

	origins map[[2]string]*move
}

func newTreeCRDT() *treeCRDT {
	ts := &treeCRDT{
		log:     btree.NewBTreeGOptions((*move).ByID, btree.Options{NoLocks: true, Degree: 8}),
		tree:    btree.NewBTreeGOptions((*move).ByParentOrder, btree.Options{NoLocks: true, Degree: 8}),
		origins: make(map[[2]string]*move),
	}

	return ts
}

func (state *treeCRDT) integrate(opID opID, block, parent, left, leftOrigin string) error {
	origin := [2]string{block, opID.Origin}
	if _, ok := state.origins[origin]; ok {
		return fmt.Errorf("duplicate move operation per block and origin: %s@%s", block, opID.Origin)
	}

	if left == TrashNodeID {
		return fmt.Errorf("left must not be trash")
	}

	if left != "" && leftOrigin == "" {
		return fmt.Errorf("leftOrigin must be set if left is set")
	}

	// find move in tree by parent and left and left origin
	li, ri, err := state.findInsertionPoint(opID, parent, left, leftOrigin)
	if err != nil {
		return err
	}

	idx, err := fracdex.KeyBetween(li, ri)
	if err != nil {
		return fmt.Errorf("failed to create fracdex between %s and %s: %w", li, ri, err)
	}

	op := &move{
		OpID:       opID,
		Block:      block,
		Parent:     parent,
		Left:       left,
		LeftOrigin: leftOrigin,
		Fracdex:    idx,
	}

	state.log.SetHint(op, &state.logHint)
	state.tree.SetHint(op, &state.treeHint)
	state.origins[origin] = op

	return nil
}

func (state *treeCRDT) findInsertionPoint(opID opID, parent, block, origin string) (left string, right string, err error) {
	pivot := &move{Parent: parent}

	var found *move

	if block == "" && origin == "" {
		found = pivot
	}

	state.tree.AscendHint(pivot, func(x *move) bool {
		if x == pivot {
			return true
		}

		if x.Parent > parent {
			return false
		}

		if found == nil {
			if x.Parent == parent && x.Block == block && x.OpID.Origin == origin {
				found = x
				left = x.Fracdex
			}
			return true
		}

		// Following the RGA rules here.
		// If item to the right of our initial insertion point is concurrent to our op,
		// we skip over it.

		if x.OpID.Less(opID) {
			right = x.Fracdex
			return false
		}

		found = x
		left = x.Fracdex
		return true
	}, &state.treeHint)

	if found == nil {
		return "", "", fmt.Errorf("block %s@%s not found under parent %s", block, origin, parent)
	}

	return left, right, nil
}

type treeMutation struct {
	tree                   *btree.BTreeG[*move]
	treeHint               btree.PathHint
	parents                map[string]string
	originalWinners        *btree.Map[string, *move]
	dirtyWinners           *btree.Map[string, *move]
	originalInvisibleMoves map[*move]struct{}
	dirtyInvisibleMoves    map[*move]struct{}
}

func (state *treeCRDT) mutate() *treeMutation {
	vt := &treeMutation{
		tree:                   state.tree.Copy(),
		parents:                make(map[string]string),
		originalWinners:        btree.NewMap[string, *move](16),
		originalInvisibleMoves: make(map[*move]struct{}),
		dirtyInvisibleMoves:    make(map[*move]struct{}),
	}

	state.log.Scan(func(x *move) bool {
		lastMove, ok := vt.originalWinners.Get(x.Block)
		if ok && x.OpID.Less(lastMove.OpID) {
			panic("BUG: unsorted moves")
		}

		if vt.isAncestor(x.Block, x.Parent) {
			vt.originalInvisibleMoves[x] = struct{}{}
			return true
		}

		if lastMove != nil {
			vt.originalInvisibleMoves[lastMove] = struct{}{}
		}

		vt.originalWinners.Set(x.Block, x)
		vt.parents[x.Block] = x.Parent

		return true
	})

	vt.dirtyWinners = vt.originalWinners.Copy()
	vt.dirtyInvisibleMoves = maps.Clone(vt.originalInvisibleMoves)

	return vt
}

func (mut *treeMutation) isAncestor(a, b string) bool {
	c := mut.parents[b]
	for {
		if c == "" || c == TrashNodeID {
			return false
		}

		if c == a {
			return true
		}

		c = mut.parents[c]
	}
}

func (mut *treeMutation) move(block, parent, left string) (moveEffect, error) {
	if block == "" {
		return moveEffectNone, fmt.Errorf("block must not be empty")
	}

	if block == left {
		return moveEffectNone, fmt.Errorf("block and left must not be the same")
	}

	if left == TrashNodeID {
		panic("BUG: trash can't be left")
	}

	if parent != "" && left != "" && parent == left {
		return moveEffectNone, fmt.Errorf("parent and left must not be the same")
	}

	// Check if parent is in the tree.
	if parent != "" && parent != TrashNodeID {
		if _, ok := mut.parents[parent]; !ok {
			return moveEffectNone, fmt.Errorf("desired parent block %s is not in the tree", parent)
		}
	}

	// Preventing cycles.
	if mut.isAncestor(block, parent) {
		return moveEffectNone, fmt.Errorf("cycle detected: block %s is ancestor of %s", block, parent)
	}

	// Check if the desired left is actually a child of the desired parent.
	var currentLeft *move
	if left != "" {
		leftPos, ok := mut.dirtyWinners.Get(left)
		if !ok {
			return moveEffectNone, fmt.Errorf("left block %s is not in the tree", left)
		}

		if leftPos.Parent != parent {
			return moveEffectNone, fmt.Errorf("left block %s is not a child of parent %s", left, parent)
		}

		currentLeft = leftPos
	} else {
		// Sentinel value for the beginning of the sublist.
		currentLeft = &move{Parent: parent}
	}

	// Checking if our move is actually a move or a create.
	var me moveEffect
	prevWinner, _ := mut.dirtyWinners.Get(block)
	switch {
	case prevWinner == nil:
		me = moveEffectCreated
	case prevWinner != nil:
		// When we're moving to trash we don't care about the sibling order.
		if prevWinner.Parent == TrashNodeID && parent == TrashNodeID {
			return moveEffectNone, nil
		}

		// If previous move of this block is our own move, we can safely delete it.
		// Otherwise we mark the previous move as invisible.
		if prevWinner.OpID.Origin == "" {
			mut.tree.DeleteHint(prevWinner, &mut.treeHint)
			delete(mut.dirtyInvisibleMoves, prevWinner)
			delete(mut.originalInvisibleMoves, prevWinner)
		} else {
			mut.dirtyInvisibleMoves[prevWinner] = struct{}{}
		}

		me = moveEffectMoved
	default:
		panic("BUG: invalid move case")
	}

	mut.parents[block] = parent

	var rightIndex string
	mut.tree.AscendHint(currentLeft, func(x *move) bool {
		if x == currentLeft {
			return true
		}

		if x.Parent == parent {
			rightIndex = x.Fracdex
		}

		return false
	}, &mut.treeHint)

	newIndex, err := fracdex.KeyBetween(currentLeft.Fracdex, rightIndex)
	if err != nil {
		return moveEffectNone, fmt.Errorf("failed to create fracdex for move %q %q %q: %w", block, parent, left, err)
	}

	// Assemble the move. Preliminary moves don't need CRDT metadata.
	m := &move{
		Block:   block,
		Parent:  parent,
		Fracdex: newIndex,
	}

	// The new move we just created should be invisible if we look at the original state.
	mut.originalInvisibleMoves[m] = struct{}{}
	mut.tree.SetHint(m, &mut.treeHint)
	mut.dirtyWinners.Set(block, m)

	// Maybe do the naive cleanup. We can only do it if we move within the same parent.
	original, ok := mut.originalWinners.Get(block)
	if !ok && m.Parent == TrashNodeID {
		// If we're moving a block to trash,
		// and this block didn't exist in the original tree,
		// we can just discard this move all together.
		delete(mut.dirtyInvisibleMoves, m)
		delete(mut.originalInvisibleMoves, m)
		mut.dirtyWinners.Delete(block)
		mut.tree.DeleteHint(m, &mut.treeHint)

		return moveEffectMoved, nil
	}
	if ok && original.Parent == m.Parent {
		currentLeft, currentLeftID := mut.visibleLeftSibling(m, mut.dirtyInvisibleMoves)

		// This assertion is probably not needed.
		if _, ok := mut.originalInvisibleMoves[original]; ok {
			panic("BUG: original winner is invisible")
		}

		// If the visible left sibling of the original position is the same as the new move's left,
		// then we know our new move didn't do anything.
		originalLeft, originalLeftID := mut.visibleLeftSibling(original, mut.originalInvisibleMoves)
		if originalLeft == currentLeft && originalLeftID.Origin == currentLeftID.Origin {
			// This move is redundant with the original winner.
			// Ignore this new move by making it invisible.
			// And restore the original move.
			delete(mut.dirtyInvisibleMoves, m)
			delete(mut.dirtyInvisibleMoves, original)
			delete(mut.originalInvisibleMoves, m)
			mut.dirtyWinners.Set(block, original)
			mut.tree.DeleteHint(m, &mut.treeHint)
			mut.tree.SetHint(original, &mut.treeHint)
			return moveEffectMoved, nil
		}
	}

	return me, nil
}

func (mut *treeMutation) forEachMove(fn func(block, parent, left, leftOrigin string) bool) {
	mut.walkDFT(func(m *move) bool {
		// We only care about moves that we touched.
		if m.OpID.Origin != "" {
			return true
		}

		if m.Parent == TrashNodeID {
			panic("BUG: cleanup must only walk the visible block tree")
		}

		currentLeft, currentLeftID := mut.visibleLeftSibling(m, mut.dirtyInvisibleMoves)

		return fn(m.Block, m.Parent, currentLeft, currentLeftID.Origin)
	})

	// Now walk the deleted blocks.
	pivot := &move{Parent: TrashNodeID}
	mut.tree.AscendHint(pivot, func(m *move) bool {
		if m == pivot || m.Parent != pivot.Parent {
			return true
		}

		// We only care about our own moves.
		if m.OpID.Origin != "" {
			return true
		}

		return fn(m.Block, m.Parent, "", "")
	}, &mut.treeHint)
}

func (mut *treeMutation) commit(origin string, ts int64, state *treeCRDT) (err error) {
	if mut.tree == state.tree {
		panic("BUG: mutation must not be applied on the same state")
	}

	var idx int
	mut.forEachMove(func(block, parent, left, leftOrigin string) bool {
		// If we have a left but don't have origin, it's our own move,
		// so we set it our own origin.
		if left != "" && leftOrigin == "" {
			leftOrigin = origin
		}

		if err := state.integrate(newOpID(origin, ts, idx), block, parent, left, leftOrigin); err != nil {
			err = fmt.Errorf("failed to integrate preliminary move (%s, %s, %s@%s): %w", block, parent, left, leftOrigin, err)
			return false
		}

		idx++
		return true
	})

	return err
}

// walkDFT walks the visible tree in depth-first order.
func (mut *treeMutation) walkDFT(fn func(m *move) bool) {
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

		if !fn(x) {
			break
		}

		addChild(x.Block)
	}
}

func (mut *treeMutation) visibleLeftSibling(m *move, invisible map[*move]struct{}) (blockID string, opid opID) {
	mut.tree.DescendHint(m, func(x *move) bool {
		if x == m {
			return true
		}

		if x.Parent != m.Parent {
			return false
		}

		if _, ok := invisible[x]; ok {
			return true
		}

		blockID = x.Block
		opid = x.OpID
		return false
	}, &mut.treeHint)

	return blockID, opid
}

type move struct {
	OpID       opID
	Block      string
	Parent     string
	Left       string
	LeftOrigin string
	Fracdex    string
}

func (m *move) Index() string {
	if m == nil {
		return ""
	}

	return m.Fracdex
}

func (m *move) ByParentOrder(mm *move) bool {
	if m.Parent == mm.Parent {
		if m.Fracdex == mm.Fracdex && m != mm {
			panic(fmt.Errorf("BUG: duplicated fracdex within parent %+v %+v", m, mm))
		}
		return m.Fracdex < mm.Fracdex
	}

	return m.Parent < mm.Parent
}

func (m *move) ByID(mm *move) bool {
	return m.OpID.Less(mm.OpID)
}
