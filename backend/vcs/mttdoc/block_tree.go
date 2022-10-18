package mttdoc

import (
	"fmt"
	"mintter/backend/vcs/crdt"
	vcsdb "mintter/backend/vcs/sqlitevcs"
)

type blockTree struct {
	blockPos map[vcsdb.NodeID]*crdt.ListElement[BlockPosition] // block-id => current position
	children map[vcsdb.NodeID]*crdt.RGA[BlockPosition]         // parent => children
	tracker  *crdt.OpTracker
	dw       *vcsdb.DatomWriter
}

func newBlockTree(ot *crdt.OpTracker, dw *vcsdb.DatomWriter) *blockTree {
	return &blockTree{
		blockPos: make(map[vcsdb.NodeID]*crdt.ListElement[BlockPosition]),
		children: map[vcsdb.NodeID]*crdt.RGA[BlockPosition]{
			vcsdb.RootNode:  crdt.NewRGA[BlockPosition](lessComparator),
			vcsdb.TrashNode: crdt.NewRGA[BlockPosition](lessComparator),
		},
		tracker: ot,
		dw:      dw,
	}
}

func (bt *blockTree) MoveBlock(block, parent, left vcsdb.NodeID) (moved bool, err error) {
	if bt.isAncestor(block, parent) {
		return false, fmt.Errorf("can't move: %s is ancestor of %s", block, parent)
	}

	refID := crdt.ListStart
	leftPosNode := parent
	if !left.IsZero() {
		el, err := bt.findBlockPosition(left)
		if err != nil {
			return false, fmt.Errorf("failed to find left block: %w", err)
		}
		refID = el.ID()
		leftPosNode = el.Value().ID
	}

	posNode := vcsdb.NewNodeID()
	d1 := bt.dw.NewDatom(vcsdb.RootNode, AttrMove, posNode)
	d2 := bt.dw.NewDatom(posNode, AttrPosBlock, block)
	d3 := bt.dw.NewDatom(posNode, AttrPosParent, parent)
	d4 := bt.dw.NewDatom(posNode, AttrPosLeft, leftPosNode)

	moved, err = bt.integrateMove(d4.OpID, block, parent, posNode, refID)
	if moved && err == nil {
		bt.dw.AddDatom(d1, d2, d3, d4)
	}

	return moved, err
}

func (bt *blockTree) Iterator() *Iterator {
	l, ok := bt.children[vcsdb.RootNode]
	if !ok {
		panic("BUG: must have top-level root list of children")
	}

	return &Iterator{
		doc:   bt,
		stack: []*crdt.ListElement[BlockPosition]{l.Root().NextAlive()},
	}
}

func (bt *blockTree) integrateMove(id vcsdb.OpID, block, parent, posID vcsdb.NodeID, refID vcsdb.OpID) (moved bool, err error) {
	if block.IsReserved() {
		return false, fmt.Errorf("can't move reserved nodes")
	}

	if block == parent {
		return false, fmt.Errorf("can't move block under itself")
	}

	l := bt.getChildren(parent)
	el, err := l.GetElement(refID)
	if err != nil {
		return false, err
	}

	// Don't do anything if block is already where we want.
	curPos := bt.blockPos[block]
	if curPos != nil && curPos.Value().Parent == parent {
		prevLive := curPos.PrevAlive()
		if prevLive == el || prevLive == nil && el.ID().IsZero() {
			return false, nil
		}
	}

	// We can safely update clock here, because we've checked all the invariants up to this point.
	// Although we still have to make the ancestorship check, these invalid moves would still
	// allocate a position, but won't perform the actual move.
	if err := bt.tracker.Track(id); err != nil {
		return false, err
	}

	newEl, err := l.InsertAfter(id, el, BlockPosition{
		ID:     posID,
		Block:  block,
		Parent: parent,
	})
	if err != nil {
		return false, err
	}

	moved = bt.doMove(block, newEl)

	return moved, nil
}

func (bt *blockTree) getChildren(parent vcsdb.NodeID) *crdt.RGA[BlockPosition] {
	l := bt.children[parent]
	if l == nil {
		l = crdt.NewRGA[BlockPosition](lessComparator)
		bt.children[parent] = l
	}
	return l
}

func (bt *blockTree) doMove(blk vcsdb.NodeID, li *crdt.ListElement[BlockPosition]) (moved bool) {
	if bt.isAncestor(blk, li.Value().Parent) {
		return false
	}

	if curPos, ok := bt.blockPos[blk]; ok {
		curPos.MarkDeleted()
	}
	bt.blockPos[blk] = li

	return true
}

func (bt *blockTree) isAncestor(a, b vcsdb.NodeID) bool {
	// check if a is ancestor of b transitively.
	cur := b

	for {
		pos, ok := bt.blockPos[cur]
		if !ok {
			return false
		}

		parent := pos.Value().Parent
		if parent == a {
			return true
		}
		cur = parent
	}
}

// Iterator walks the document hierarchy in depth-first order.
type Iterator struct {
	doc   *blockTree
	stack []*crdt.ListElement[BlockPosition]
}

// Next returns the next item.
func (it *Iterator) Next() *crdt.ListElement[BlockPosition] {
START:
	if len(it.stack) == 0 {
		return nil
	}

	idx := len(it.stack) - 1
	el := it.stack[idx]

	if el == nil {
		it.stack = it.stack[:idx]
		goto START
	}

	blk := el.Value().Block
	l := it.doc.children[blk]
	if l != nil {
		it.stack = append(it.stack, l.Root().NextAlive())
	}

	it.stack[idx] = el.NextAlive()

	return el
}

func (bt *blockTree) findBlockPosition(blk vcsdb.NodeID) (*crdt.ListElement[BlockPosition], error) {
	el := bt.blockPos[blk]
	if el == nil {
		return nil, fmt.Errorf("block %s is not in the document", blk)
	}
	return el, nil
}

// BlockPosition is an instance of a block at some position
// within the hierarchy of content blocks.
type BlockPosition struct {
	// ID of the position node itself.
	ID vcsdb.NodeID
	// Parent block ID where this position lives.
	Parent vcsdb.NodeID
	// Block is a content block that's supposed to be at this position.
	// When blocks are moved their position are still there,
	// although their RGA list elements are marked as deleted.
	Block vcsdb.NodeID
}
