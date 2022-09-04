package crdt

import "fmt"

// Sentinel identifiers for subtrees.
const (
	RootNodeID  = "$ROOT$"
	TrashNodeID = "$TRASH$"
)

// node of a CRDT tree.
type node struct {
	id       string
	pos      *listElement
	children *list
}

// Tree is a CRDT that allows to create nodes in a tree
// with ordered siblings, and support for moves.
// All nodes must have unique identifiers within the tree.
// Positions for nodes are allocated using separate list CRDT for each parent,
// and then those positions are "linked" to the nodes inside move operations.
//
// At the moment there's no of-the-shelf tree CRDT that supports moves and
// ordered siblings. It's pretty hard to implement, and naive implementation
// would probably suffer from some known, but hard to debug issues (namely cycles).
// After bumping into those issues I discovered Martin Kleppmann's paper
// which exactly addresses those issues. Kudos to Martin for his research effort.
//
// See: https://martin.kleppmann.com/papers/move-op.pdf for details.
//
// Briefly: all moves are kept in memory with their "inverse" values,
// so whenever a new move operation comes in with an older ID, we undo all
// newer moves, apply the incoming one, and redo the undone moves. The result is
// as if we've received all moves in order. This means that some older moves
// could invalidate newer moves, and vice-versa. But the result is always a correct tree.
// This only affects parent-child relationship. Ordering of siblings remains stable,
// and follows the rules of the list CRDT. List positions are never moved nor
// deleted, but could be "unlinked" and left dangling.
type Tree struct {
	lessFunc func(OpID, OpID) bool
	nodes    map[string]*node
	movesLog []moveRecord
	ops      map[OpID]struct{}
	maxClock int
}

type moveRecord struct {
	ID            OpID
	NodeID        string
	ParentID      string
	LeftSiblingID OpID
	OldPosition   *listElement
}

// NewTree creates a new Tree with a given Frontier.
func NewTree(fn LessFunc) *Tree {
	d := &Tree{
		lessFunc: fn,
		nodes: map[string]*node{
			RootNodeID: {
				id:       RootNodeID,
				children: newList(RootNodeID, fn),
			},
			TrashNodeID: {
				id:       TrashNodeID,
				children: newList(TrashNodeID, fn),
			},
		},
	}

	return d
}

// SetNodePosition is a convenience method for specifying node positions
// in terms of node IDs using the current state of the tree.
// The position of a node is defined by it's parent node ID, and it's left sibling node ID.
// If the node is already where it should be, no new operations will be produced.
func (d *Tree) SetNodePosition(op OpID, nodeID, parentID, leftID string) error {
	var leftPos *listElement
	if leftID == "" {
		l, err := d.findSubtree(parentID)
		if err != nil {
			return err
		}

		leftPos = &l.root
	} else {
		c := d.nodes[leftID]
		if c == nil {
			return fmt.Errorf("left sibling node %s is not in the tree", leftID)
		}

		leftPos = c.pos
	}

	if leftPos == nil || leftPos.list.id != parentID {
		return fmt.Errorf("left node %s is not child of %s", leftID, parentID)
	}

	// We don't want to do anything if the node is already where it should be.
	if next := leftPos.NextFilled(); next != nil && next.value.(*node).id == nodeID {
		return nil
	}

	return d.MoveNode(op, nodeID, parentID, leftPos.id)
}

// MoveNode from it's current position to the new one. ID of the node MUST exist in the tree.
func (d *Tree) MoveNode(op OpID, nodeID, parentID string, leftPos OpID) error {
	return d.integrateMove(op, nodeID, parentID, leftPos)
}

// DeleteNode from the tree. In reality the node is moved under a designated "trash" node.
// So the ID of the Node will still be known to the tree. To undo the deletion, move
// the node to another position. ID of the node MUST exist in the tree.
func (d *Tree) DeleteNode(op OpID, nodeID string) error {
	return d.MoveNode(op, nodeID, TrashNodeID, listEnd)
}

// Iterator creates a new TreeIterator to walk the current
// node position in the depth-first order.
func (d *Tree) Iterator() *TreeIterator {
	l := d.nodes[RootNodeID].children
	if l == nil {
		panic("BUG: must have root subtree")
	}

	return &TreeIterator{
		doc:   d,
		stack: []*listElement{l.root.NextFilled()},
	}
}

func (d *Tree) integrateMove(id OpID, nodeID, parentID string, ref OpID) error {
	if nodeID == "" {
		return fmt.Errorf("must specify nodeID")
	}

	if nodeID == parentID {
		return fmt.Errorf("can't move node %s under itself", nodeID)
	}

	l, err := d.findSubtree(parentID)
	if err != nil {
		return err
	}

	refPos, err := l.findPos(ref)
	if err != nil {
		return err
	}

	blk := d.nodes[nodeID]
	if blk == nil {
		blk = &node{
			id: nodeID,
		}
		d.nodes[nodeID] = blk
	}

	if right := refPos.Next(); right != nil && right.value != nil && right.value.(*node).id == nodeID {
		return nil
	}

	// We can safely update clock here, because we've checked all the invariants up to this point.
	// Although we still have to make the ancestorship check, these invalid moves would still
	// allocate a position, but won't perform the actual move.
	d.track(id)

	newOp := moveRecord{
		ID:            id,
		NodeID:        nodeID,
		ParentID:      parentID,
		LeftSiblingID: ref,
		OldPosition:   blk.pos,
	}

	pos, err := l.integrate(id, refPos, blk)
	if err != nil {
		return err
	}

	movesCount := len(d.movesLog)

	// We can avoid the undo-redo cycle if that's the first move operation, or if
	// the ID of the incoming operation is greater than the last known operation.
	if movesCount == 0 || d.lessFunc(d.movesLog[movesCount-1].ID, id) {
		d.movesLog = append(d.movesLog, newOp)
		d.doMove(blk, pos)
		return nil
	}

	// If we're here it means we're integrating an older move operation,
	// hence we need to undo all the moves that came after this one, and then
	// redo those again.

	var dest int
	for i := movesCount - 1; i >= 0; i-- {
		op := d.movesLog[i]
		if d.lessFunc(op.ID, id) {
			dest = i + 1
			break
		}

		d.undoMove(op, i)
	}

	d.movesLog = append(d.movesLog, moveRecord{})
	copy(d.movesLog[dest+1:], d.movesLog[dest:])
	d.movesLog[dest] = newOp

	d.doMove(blk, pos)

	// Redo operations
	for i := dest + 1; i < len(d.movesLog); i++ {
		if err := d.redoMove(d.movesLog[i], i); err != nil {
			panic("BUG: failed to redo operation, this must never fail")
		}
	}

	return nil
}

func (d *Tree) track(op OpID) {
	if d.ops == nil {
		d.ops = make(map[OpID]struct{})
	}
	d.ops[op] = struct{}{}

	if op.LamportTime > d.maxClock {
		d.maxClock = op.LamportTime
	}
}

func (d *Tree) doMove(blk *node, pos *listElement) {
	if d.isAncestor(blk.id, pos.list.id) {
		pos.value = nil
		return
	}

	if blk.pos != nil {
		blk.pos.value = nil
	}

	blk.pos = pos
	pos.value = blk
}

func (d *Tree) undoMove(op moveRecord, idx int) {
	blk := d.nodes[op.NodeID]

	if blk.pos != nil {
		blk.pos.value = nil
	}

	if op.OldPosition != nil {
		op.OldPosition.value = blk
		blk.pos = op.OldPosition
	}
}

func (d *Tree) redoMove(op moveRecord, idx int) error {
	blk := d.nodes[op.NodeID]

	l, err := d.findSubtree(op.ParentID)
	if err != nil {
		return err
	}

	pos, err := l.findPos(op.ID)
	if err != nil {
		return err
	}

	if d.isAncestor(blk.id, pos.list.id) {
		pos.value = nil
		return nil
	}

	if blk.pos != nil {
		blk.pos.value = nil
	}

	d.movesLog[idx].OldPosition = blk.pos
	blk.pos = pos
	pos.value = blk

	return nil
}

// isAncestor checks if a is ancestor of b include transitive nodes.
func (d *Tree) isAncestor(a, b string) bool {
	c := d.nodes[b]
	for {
		if c == nil || c.pos == nil {
			return false
		}

		if c.pos.list.id == a {
			return true
		}

		c = d.nodes[c.pos.list.id]
	}
}

func (d *Tree) findSubtree(id string) (*list, error) {
	n := d.nodes[id]
	if n == nil {
		return nil, fmt.Errorf("node ID %q is not in the tree", id)
	}

	if n.children == nil {
		n.children = newList(id, d.lessFunc)
	}

	return n.children, nil
}

// TreeIterator walks the tree in the depth-first order.
// Create by the Tree's Iterator() method.
type TreeIterator struct {
	doc   *Tree
	stack []*listElement
}

// next returns the next Node or nil when reached end of the tree.
func (it *TreeIterator) next() *node {
START:
	if len(it.stack) == 0 {
		return nil
	}

	idx := len(it.stack) - 1

	pos := it.stack[idx]

	if pos == nil {
		it.stack = it.stack[:idx]
		goto START
	}

	blk := pos.value.(*node)
	if blk.children != nil {
		it.stack = append(it.stack, blk.children.root.NextFilled())
	}

	it.stack[idx] = pos.NextFilled()

	return blk
}

// TreeIteratorItem is an item returned by TreeIterator.
type TreeIteratorItem struct {
	Parent string
	NodeID string
}

// IsZero checks if item is zero value.
func (t *TreeIteratorItem) IsZero() bool {
	return t.NodeID == "" && t.Parent == ""
}

// NextItem returns the Next item in the iterator.
func (it *TreeIterator) NextItem() TreeIteratorItem {
	next := it.next()
	if next == nil {
		return TreeIteratorItem{}
	}

	return TreeIteratorItem{
		Parent: next.pos.list.id,
		NodeID: next.id,
	}
}
