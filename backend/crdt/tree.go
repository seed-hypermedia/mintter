package crdt

import "fmt"

// Sentinel identifiers for subtrees.
const (
	RootSubtree  = "$ROOT$"
	TrashSubtree = "$TRASH$"
)

// Node of a CRDT tree.
type Node struct {
	id  string
	pos *Position
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
// so whenever a new move operation comes in which has an older ID, we undo all
// newer moves, apply the incoming one, and redo the undone moves. The result is
// as if we've received all moves in order. This means that some older moves
// could invalidate newer moves, and vice-versa. But the result is always a correct tree.
// This only affects parent-child relationship. Ordering of siblings remains stable,
// and follows the rules of the list CRDT. List positions are never moved nor
// deleted, but could be "unlinked" and left dangling.
type Tree struct {
	nodes    map[string]*Node
	lists    map[string]*list
	parents  map[string]*list
	movesLog []moveRecord
	front    *Frontier
}

type moveRecord struct {
	ID            ID
	NodeID        string
	ParentID      string
	LeftSiblingID ID
	OldPosition   *Position
}

// NewTree creates a new Tree with a given Frontier.
func NewTree(front *Frontier) *Tree {
	d := &Tree{
		nodes: map[string]*Node{},
		lists: map[string]*list{
			RootSubtree:  newList(RootSubtree),
			TrashSubtree: newList(TrashSubtree),
		},
		parents: map[string]*list{},
		front:   front,
	}

	return d
}

func (d *Tree) SetNodePosition(site, nodeID, parentID, leftID string) error {
	var leftPos *Position
	if leftID == "" {
		l, err := d.findList(parentID)
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
	next := leftPos.NextFilled()
	if next != nil && next.value.(*Node).id == nodeID {
		return nil
	}

	return d.MoveNode(site, nodeID, parentID, leftPos.id)
}

// MoveNode from it's current position to the new one. ID of the node MUST exist in the tree.
func (d *Tree) MoveNode(site, nodeID, parentID string, leftPos ID) error {
	return d.integrateMove(d.newID(site), nodeID, parentID, leftPos)
}

// DeleteNode from the tree. In reality the node is moved under a designated "trash" node.
// So the ID of the Node will still be known to the tree. To undo the deletion, move
// the node to another position. ID of the node MUST exist in the tree.
func (d *Tree) DeleteNode(site, nodeID string) error {
	return d.MoveNode(site, nodeID, TrashSubtree, listEnd)
}

// Iterator creates a new TreeIterator to walk the current
// node position in the depth-first order.
func (d *Tree) Iterator() *TreeIterator {
	l := d.lists[RootSubtree]
	if l == nil {
		panic("BUG: must have root subtree")
	}

	return &TreeIterator{
		doc:   d,
		stack: []*Position{l.root.NextFilled()},
	}
}

func (d *Tree) integrateMove(id ID, nodeID, parentID string, ref ID) error {
	if nodeID == "" {
		return fmt.Errorf("must specify nodeID")
	}

	if nodeID == parentID {
		return fmt.Errorf("can't move node %s under itself", nodeID)
	}

	l, err := d.findList(parentID)
	if err != nil {
		return err
	}

	refPos, err := l.findPos(ref)
	if err != nil {
		return err
	}

	blk := d.nodes[nodeID]
	if blk == nil {
		blk = &Node{
			id: nodeID,
		}
		d.nodes[nodeID] = blk
	}

	if right := refPos.Next(); right != nil && right.value != nil && right.value.(*Node).id == nodeID {
		return fmt.Errorf("node %s is already next to position %v", nodeID, ref)
	}

	// We can safely update clock here, because we've checked all the invariants up to this point.
	// Although we still have to make the ancestorship check, these invalid moves would still
	// allocate a position, but won't perform the actual move.
	if err := d.front.Track(id); err != nil {
		return err
	}

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
	if movesCount == 0 || d.movesLog[movesCount-1].ID.Less(id) {
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
		if op.ID.Less(id) {
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

func (d *Tree) doMove(blk *Node, pos *Position) {
	if d.isAncestor(blk.id, pos.list.id) {
		pos.value = nil
		return
	}

	if blk.pos != nil {
		blk.pos.value = nil
	}

	blk.pos = pos
	pos.value = blk
	d.parents[blk.id] = pos.list
}

func (d *Tree) undoMove(op moveRecord, idx int) {
	blk := d.nodes[op.NodeID]

	if blk.pos != nil {
		blk.pos.value = nil
	}

	if op.OldPosition != nil {
		op.OldPosition.value = blk
		blk.pos = op.OldPosition
		d.parents[blk.id] = blk.pos.list
	} else {
		delete(d.parents, blk.id)
	}
}

func (d *Tree) redoMove(op moveRecord, idx int) error {
	blk := d.nodes[op.NodeID]

	l, err := d.findList(op.ParentID)
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
	d.parents[blk.id] = pos.list

	return nil
}

// isAncestor checks if a is ancestor of b include transitive nodes.
func (d *Tree) isAncestor(a, b string) bool {
	for parent := d.parents[b]; parent != nil; parent = d.parents[parent.id] {
		if parent.id == a {
			return true
		}
	}
	return false
}

func (d *Tree) newID(site string) ID {
	return d.front.NewID(site)
}

func (d *Tree) findList(id string) (*list, error) {
	if id == "" {
		return nil, fmt.Errorf("must specify parent node ID")
	}

	if id != RootSubtree && id != TrashSubtree && d.nodes[id] == nil {
		return nil, fmt.Errorf("parent node ID %s doesn't exist in the tree", id)
	}

	l := d.lists[id]
	if l == nil {
		l = newList(id)
		d.lists[id] = l
	}

	return l, nil
}

// TreeIterator walks the tree in the depth-first order.
// Create by the Tree's Iterator() method.
type TreeIterator struct {
	doc   *Tree
	stack []*Position
}

// Next returns the next Node or nil when reached end of the tree.
func (it *TreeIterator) Next() *Node {
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

	blk := pos.value.(*Node)

	children := it.doc.lists[blk.id]
	if children != nil {
		it.stack = append(it.stack, children.root.NextFilled())
	}

	it.stack[idx] = pos.NextFilled()

	return blk
}
