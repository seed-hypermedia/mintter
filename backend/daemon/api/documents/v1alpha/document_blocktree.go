package documents

import (
	"container/list"
	"fmt"
	"strconv"
	"strings"
)

type OpID struct {
	Time   int64
	Origin string
	Idx    int
}

func NewOpID(time int64, origin string, idx int) OpID {
	return OpID{Time: time, Origin: origin, Idx: idx}
}

func (o OpID) String() string {
	return strconv.Itoa(int(o.Time)) + "@" + o.Origin + "+" + strconv.Itoa(o.Idx)
}

func (o OpID) Less(oo OpID) bool {
	if o.Time < oo.Time {
		return true
	}
	if o.Time > oo.Time {
		return false
	}

	if o.Origin < oo.Origin {
		return true
	}
	if o.Origin > oo.Origin {
		return false
	}

	return o.Idx < oo.Idx
}

const TrashNodeID = "◊"

type Tree struct {
	nodes        map[string]*TreeNode
	maxOp        OpID
	shadows      map[string]*list.Element
	localMoves   []string
	initialLefts map[string]*list.Element
}

func newSubtree(id string) *list.List {
	l := list.New()

	// Sentinel list start position.
	l.PushFront(ShadowPosition{
		parent: id,
		list:   l,
	})

	return l
}

func NewTree() *Tree {
	return &Tree{
		nodes: map[string]*TreeNode{
			// Empty string is the root of the tree.
			"": {
				id:       "",
				children: newSubtree(""),
			},
			TrashNodeID: {
				id:       TrashNodeID,
				children: newSubtree(TrashNodeID),
			},
		},
		shadows:      make(map[string]*list.Element),
		initialLefts: make(map[string]*list.Element),
	}
}

func (t *Tree) MustMoveRemote(id OpID, block, parent, leftShadow string) (moved bool) {
	moved, err := t.MoveRemote(id, block, parent, leftShadow)
	if err != nil {
		panic(err)
	}
	return moved
}

func (t *Tree) MoveRemote(id OpID, block, parent, leftShadow string) (moved bool, err error) {
	if block == "" {
		return false, fmt.Errorf("must specify block")
	}

	if block == parent {
		return false, fmt.Errorf("refuse to move block %s under itself", block)
	}

	if !t.maxOp.Less(id) {
		return false, fmt.Errorf("out of order remote move operation")
	}
	defer func() {
		if moved {
			t.maxOp = id
		}
	}()

	subtree, left, err := t.findLeftShadow(parent, leftShadow)
	if err != nil {
		return false, err
	}

	shadowPos := ShadowPosition{
		shadowID: block + "@" + id.Origin,
		parent:   parent,
		opid:     id,
		list:     subtree,
	}

	if _, ok := t.shadows[shadowPos.shadowID]; ok {
		return false, fmt.Errorf("duplicate shadow block move %s", shadowPos.shadowID)
	}

	// RGA concurrent insertion conflict resolution.
	for right := left.Next(); right != nil; right = right.Next() {
		rpos := right.Value.(ShadowPosition)
		if id.Less(rpos.opid) {
			left = right
		} else {
			break
		}
	}
	pos := subtree.InsertAfter(shadowPos, left)

	blk := t.nodes[block]
	if blk == nil {
		blk = &TreeNode{
			id: block,
		}
		t.nodes[block] = blk
	}

	t.shadows[shadowPos.shadowID] = pos
	if t.initialLefts[block] == nil {
		t.initialLefts[block] = left
	}

	// check for cycles
	if t.isAncestor(block, parent) {
		return false, nil
	}

	blk.pos = pos

	return true, nil
}

// isAncestor checks if a is ancestor of b include transitive nodes.
func (t *Tree) isAncestor(a, b string) bool {
	c := t.nodes[b]
	for {
		if c == nil || c.pos == nil {
			return false
		}

		pp := c.pos.Value.(ShadowPosition).parent
		if pp == a {
			return true
		}

		c = t.nodes[pp]
	}
}

func (t *Tree) MustMoveLocal(time int64, idx int, block, parent, left string) (moved bool) {
	moved, err := t.MoveLocal(time, idx, block, parent, left)
	if err != nil {
		panic(err)
	}
	return moved
}

func (t *Tree) MoveLocal(time int64, idx int, block, parent, leftID string) (moved bool, err error) {
	if block == "" {
		return false, fmt.Errorf("must specify block")
	}

	if block == parent {
		return false, fmt.Errorf("refuse to move block %s under itself", block)
	}

	if (parent != "" || leftID != "") && parent == leftID {
		return false, fmt.Errorf("parent and left blocks must not be the same")
	}

	if block == leftID {
		return false, fmt.Errorf("block and left must not be the same")
	}

	if t.isAncestor(block, parent) {
		return false, fmt.Errorf("cycle detected: block %s is ancestor of %s", block, parent)
	}

	id := NewOpID(time, "", idx)

	if !t.maxOp.Less(id) {
		return false, fmt.Errorf("out of order local move operation: current time = %s, incoming time = %s", t.maxOp, id)
	}
	defer func() {
		if moved {
			t.maxOp = id
		}
	}()

	subtree, left, err := t.findLeftCurrent(parent, leftID)
	if err != nil {
		return false, err
	}

	// Ignore operation if block is already where we want it to be.
	if old, ok := t.nodes[block]; ok {
		oldPos := old.pos.Value.(ShadowPosition)
		leftShadow := old.pos.Prev().Value.(ShadowPosition).shadowID
		if oldPos.parent == parent && leftShadow == left.Value.(ShadowPosition).shadowID {
			return false, nil
		}
	}

	newShadowID := block + "@" + id.Origin

	// Remove previous shadow position.
	if old, ok := t.shadows[newShadowID]; ok {
		oldPos := old.Value.(ShadowPosition)
		leftShadow := old.Prev().Value.(ShadowPosition).shadowID
		if oldPos.parent == parent && leftShadow == left.Value.(ShadowPosition).shadowID {
			return false, nil
		}
		if t.initialLefts[block] == nil {
			t.initialLefts[block] = old.Prev()
		}
		oldPos.list.Remove(old)
	}

	shadowPos := ShadowPosition{
		shadowID: newShadowID,
		parent:   parent,
		opid:     id,
		list:     subtree,
	}

	pos := subtree.InsertAfter(shadowPos, left)

	blk := t.nodes[block]
	if blk == nil {
		blk = &TreeNode{
			id: block,
		}
		t.nodes[block] = blk
	}

	blk.pos = pos
	t.shadows[shadowPos.shadowID] = pos

	t.localMoves = append(t.localMoves, block)

	return true, nil
}

func (t *Tree) findLeftCurrent(parent, left string) (*list.List, *list.Element, error) {
	n, ok := t.nodes[parent]
	if !ok {
		return nil, nil, fmt.Errorf("node %s is not in the tree", parent)
	}

	if n.children == nil {
		n.children = newSubtree(parent)
	}

	if left == "" {
		return n.children, n.children.Front(), nil
	}

	lnode, ok := t.nodes[left]
	if !ok {
		return nil, nil, fmt.Errorf("left node %s is not in the tree", left)
	}

	lpos := lnode.pos.Value.(ShadowPosition)
	if lpos.list != n.children {
		return nil, nil, fmt.Errorf("current position of block %s is not within parent %s", left, parent)
	}

	return n.children, lnode.pos, nil
}

func (t *Tree) findLeftShadow(parent, leftShadow string) (*list.List, *list.Element, error) {
	n, ok := t.nodes[parent]
	if !ok {
		return nil, nil, fmt.Errorf("node %q is not in the tree", parent)
	}

	if n.children == nil {
		n.children = newSubtree(parent)
	}

	var el *list.Element
	for next := n.children.Front(); next != nil; next = next.Next() {
		pos := next.Value.(ShadowPosition)
		if pos.shadowID == leftShadow {
			el = next
			break
		}
	}
	if el == nil {
		return nil, nil, fmt.Errorf("failed to find node %q under parent %q", leftShadow, parent)
	}

	return n.children, el, nil
}

type TreeNode struct {
	id       string
	pos      *list.Element
	children *list.List
}

type ShadowPosition struct {
	shadowID string
	opid     OpID
	parent   string
	list     *list.List
}

type TreeIterator struct {
	t     *Tree
	stack []*TreeNode
}

// Next returns the next Node or nil when reached end of the tree.
func (it *TreeIterator) Next() *TreeNode {
START:
	if len(it.stack) == 0 {
		return nil
	}

	idx := len(it.stack) - 1

	node := it.stack[idx]

	if node == nil {
		it.stack = it.stack[:idx]
		goto START
	}
	if node.children != nil {
		it.stack = append(it.stack, it.nextAlive(node.children.Front()))
	}

	it.stack[idx] = it.nextAlive(node.pos)
	// Block without ID are sentinel markers for list starts.
	if node.id == "" {
		goto START
	}

	return node
}

func (it *TreeIterator) nextAlive(el *list.Element) *TreeNode {
	if el == nil {
		return nil
	}
	for el := el.Next(); el != nil; el = el.Next() {
		sp := el.Value.(ShadowPosition)

		block, _, ok := strings.Cut(sp.shadowID, "@")
		if !ok {
			panic("BUG: bad shadow ID")
		}
		curNode, ok := it.t.nodes[block]
		if !ok {
			panic("BUG: no shadow block in the tree")
		}
		if el == curNode.pos {
			return curNode
		}
	}

	return nil
}

func (t *Tree) Iterator() *TreeIterator {
	l := t.nodes[""]
	if l == nil {
		panic("BUG: must have root subtree")
	}

	return &TreeIterator{
		t:     t,
		stack: []*TreeNode{l},
	}
}
