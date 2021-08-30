package crdt

import "fmt"

const (
	rootList  = "$ROOT$"
	trashList = "$TRASH$"
)

// Node of a CRDT tree.
type Node struct {
	opID ID
	id   string
	pos  *Position
}

// OpID is the operation ID that created the node.
func (n *Node) OpID() ID {
	return n.opID
}

// NodeID is a tree-unique node ID.
func (n *Node) NodeID() string {
	return n.id
}

// Position is the current position of the node.
func (n *Node) Position() *Position {
	return n.pos
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
			rootList:  newList(rootList),
			trashList: newList(trashList),
		},
		parents: map[string]*list{},
		front:   front,
	}

	return d
}

// CreateNode and move it to the specified place. ID of the node MUST NOT exist in the tree.
func (d *Tree) CreateNode(site, nodeID, parentID string, leftPos ID) error {
	if _, err := d.integrateCreate(d.newID(site), nodeID); err != nil {
		return err
	}

	if err := d.integrateMove(d.newID(site), nodeID, parentID, leftPos); err != nil {
		return err
	}

	return nil
}

// MoveNode from it's current position to the new one. ID of the node MUST exist in the tree.
func (d *Tree) MoveNode(site, nodeID, parentID string, leftPos ID) error {
	return d.integrateMove(d.newID(site), nodeID, parentID, leftPos)
}

// DeleteNode from the tree. In reality the node is moved under a designated "trash" node.
// So the ID of the Node will still be known to the tree. To undo the deletion, move
// the node to another position. ID of the node MUST exist in the tree.
func (d *Tree) DeleteNode(site, nodeID string) error {
	return d.MoveNode(site, nodeID, trashList, listEnd)
}

// Iterator creates a new TreeIterator to walk the current
// node position in the depth-first order.
func (d *Tree) Iterator() *TreeIterator {
	l := d.lists[rootList]
	pos := &l.root

	return &TreeIterator{
		doc:   d,
		stack: []*list{l},
		pos:   []*Position{pos},
	}
}

func (d *Tree) integrateCreate(id ID, nodeID string) (*Node, error) {
	if d.nodes[nodeID] != nil {
		return nil, fmt.Errorf("duplicate node ID %s", nodeID)
	}

	blk := &Node{
		opID: id,
		id:   nodeID,
	}

	d.nodes[nodeID] = blk

	if err := d.front.Track(id); err != nil {
		return nil, err
	}

	return blk, nil
}

func (d *Tree) integrateMove(id ID, nodeID, parentID string, ref ID) error {
	blk := d.nodes[nodeID]
	if blk == nil {
		return fmt.Errorf("node ID %s not found", nodeID)
	}

	if nodeID == parentID {
		return fmt.Errorf("can't move node %s under itself", nodeID)
	}

	l := d.findList(parentID)

	refPos, err := l.findPos(ref)
	if err != nil {
		return err
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
		d.redoMove(d.movesLog[i], i)
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

func (d *Tree) redoMove(op moveRecord, idx int) {
	blk := d.nodes[op.NodeID]

	l := d.findList(op.ParentID)
	pos, err := l.findPos(op.ID)
	if err != nil {
		panic(fmt.Errorf("BUG: can't redo undone move: %w", err))
	}

	if d.isAncestor(blk.id, pos.list.id) {
		pos.value = nil
		return
	}

	if blk.pos != nil {
		blk.pos.value = nil
	}

	d.movesLog[idx].OldPosition = blk.pos
	blk.pos = pos
	pos.value = blk
	d.parents[blk.id] = pos.list
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

func (d *Tree) findList(id string) *list {
	l := d.lists[id]
	if l == nil {
		l = newList(id)
		d.lists[id] = l
	}

	return l
}

// TreeIterator walks the tree in the depth-first order.
// Create by the Tree's Iterator() method.
type TreeIterator struct {
	doc   *Tree
	stack []*list
	pos   []*Position
}

// Next returns the next Node or nil when reached end of the tree.
func (it *TreeIterator) Next() *Node {
START:
	if len(it.stack) == 0 {
		return nil
	}

	for {
		idx := len(it.stack) - 1

		l := it.stack[idx]
		pos := it.pos[idx]
		it.pos[idx] = pos.right

		// Skip the first element.
		if pos == &l.root {
			continue
		}

		// Remove from the stack if we reached the end.
		if it.pos[idx] == &l.root {
			it.stack = it.stack[:idx]
			it.pos = it.pos[:idx]
		}

		// We have to use goto here because we need check if stack is empty again.
		// This can happen if the last element of the iterator was removed, so
		// next idx will be -1 and it will panic.
		if pos.value == nil {
			goto START
		}

		blk := pos.value.(*Node)

		children := it.doc.lists[blk.id]
		if children != nil {
			it.stack = append(it.stack, children)
			it.pos = append(it.pos, &children.root)
		}

		return blk
	}
}
