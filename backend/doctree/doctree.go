package doctree

import "fmt"

// Tree is a nested linked list data structure that organizes Blocks of a Mintter Document.
type Tree struct {
	blocks   map[string]*element
	topLevel *list
}

// New creates a new Tree.
func New() *Tree {
	return &Tree{
		blocks:   make(map[string]*element),
		topLevel: newList(),
	}
}

// Add adds a new block to the tree. Adding an already existing block must fail.
// Block position is defined by its parent and left sibling, both of which could be empty.
// If parent is empty the block will be inserted at the top-level block list. If left is empty
// the block will be prepended to the front of the selected list.
// Specified left sibling must be a child of the specified parent, otherwise the call will fail.
func (t *Tree) Add(blockID, parent, left string) error {
	if t.Has(blockID) {
		return fmt.Errorf("block with id %s is already in the tree", blockID)
	}

	l, leftEl, err := t.findPosition(parent, left)
	if err != nil {
		return err
	}

	inserted := l.insert(&element{BlockID: blockID}, leftEl)
	t.blocks[inserted.BlockID] = inserted

	return nil
}

// Has checks if a given block ID is in the tree.
func (t *Tree) Has(blockID string) (ok bool) {
	return t.blocks[blockID] != nil
}

// Remove removes the block and all its children from the tree.
func (t *Tree) Remove(blockID string) error {
	blk, ok := t.blocks[blockID]
	if !ok {
		return fmt.Errorf("block with id %s is not in the tree", blockID)
	}

	delete(t.blocks, blk.BlockID)
	blk = blk.list.remove(blk)

	if blk.Children == nil {
		return nil
	}

	blk.Children.forEach(func(el *element) bool {
		if err := t.Remove(el.BlockID); err != nil {
			panic("BUG: removing children can't fail: " + err.Error())
		}
		return true
	})
	blk.Children.init()
	blk.Children = nil // avoid memory leaks

	return nil
}

// Move moves an existing blockID to the position. Whole subtrees can be moved.
// The rules about parent and left are the same as with Add.
func (t *Tree) Move(blockID, newParent, newLeft string) error {
	blk, ok := t.blocks[blockID]
	if !ok {
		return fmt.Errorf("block with id %s is not in the tree", blockID)
	}

	list, left, err := t.findPosition(newParent, newLeft)
	if err != nil {
		return err
	}

	if list == blk.list {
		list.move(blk, left)
		return nil
	}

	blk = blk.list.remove(blk)
	list.insert(blk, left)

	return nil
}

// Walk walks the tree depth-first and call the cb for each block.
// Depth indicates the block of the block within the tree.
// Callback function can return false to stop the traversal.
func (t *Tree) Walk(cb func(blockID string, depth int) bool) {
	walk(t.topLevel, cb, 0)
}

func walk(l *list, cb func(blockID string, depth int) bool, depth int) {
	l.forEach(func(el *element) bool {
		if !cb(el.BlockID, depth) {
			return false
		}

		if el.Children != nil {
			walk(el.Children, cb, depth+1)
		}

		return true
	})
}

func (t *Tree) findPosition(parent, left string) (*list, *element, error) {
	var l *list
	if parent == "" {
		l = t.topLevel
	} else {
		el := t.blocks[parent]
		if el == nil {
			return nil, nil, fmt.Errorf("parent %s doesn't exist", parent)
		}
		// Parent may not have any children yet, that's why if need to create the list here.
		if el.Children == nil {
			el.Children = newList()
		}
		l = el.Children
	}

	var leftEl *element
	if left == "" {
		leftEl = &l.root
	} else {
		el := t.blocks[left]
		if el == nil {
			return nil, nil, fmt.Errorf("left element %s doesn't exist", left)
		}
		if el.list != l {
			return nil, nil, fmt.Errorf("block '%s' is not a child of '%s'", left, parent)
		}
		leftEl = el
	}

	return l, leftEl, nil
}

// element is an element of the linked list. Stores block ID, parent and children list.
type element struct {
	// Next and previous pointers in the doubly-linked list of elements.
	// To simplify the implementation, internally a list l is implemented
	// as a ring, such that &l.root is both the next element of the last
	// list element (l.Back()) and the previous element of the first list
	// element (l.Front()).
	next, prev *element

	// The list to which this element belongs.
	list *list

	BlockID  string
	Parent   *element
	Children *list
}

// list is a doubly-linked list data structure. Most of the code is borrowed from
// Go's container/list package, but adapted to our particular use case (nesting and parent pointers)
// without trying to be a generic data structure.
type list struct {
	root element // sentinel list element, only &root, root.prev, and root.next are used.
	len  int     // current list length excluding sentinel element.
}

func (l *list) init() *list {
	l.root.next = &l.root
	l.root.prev = &l.root
	l.len = 0
	return l
}

func newList() *list { return new(list).init() }

func (l *list) insert(e, at *element) *element {
	e.prev = at
	e.next = at.next
	e.prev.next = e
	e.next.prev = e
	e.list = l
	l.len++
	return e
}

func (l *list) move(e, at *element) *element {
	if e == at {
		return e
	}
	e.prev.next = e.next
	e.next.prev = e.prev

	e.prev = at
	e.next = at.next
	e.prev.next = e
	e.next.prev = e

	return e
}

func (l *list) remove(e *element) *element {
	e.prev.next = e.next
	e.next.prev = e.prev
	e.next = nil // avoid memory leaks
	e.prev = nil // avoid memory leaks
	e.list = nil
	l.len--
	return e
}

func (l *list) forEach(cb func(*element) bool) {
	root := &l.root
	el := root.next
	// When el == root it means that we came back to the sentinel element of the list.
	for el != root {
		next := el.next
		if !cb(el) {
			return
		}
		el = next
	}
}
