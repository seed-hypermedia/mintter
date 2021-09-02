package crdt

import "fmt"

var (
	listStart = ID{}
	listEnd   = ID{Clock: -1}
)

// list is a list CRDT. It follows RGA/CT merge semantics.
// Namely, conflicting inserts are resolved by sorting ID
// and inserting operations after the greater insert and
// their causal children.
type list struct {
	id    string
	items map[ID]*position
	root  position
}

func newList(lid string) *list {
	l := &list{
		id:    lid,
		items: map[ID]*position{},
	}

	l.root.left = &l.root
	l.root.right = &l.root
	l.items[listStart] = &l.root
	l.items[listEnd] = &l.root
	l.root.list = l

	return l
}

func (l *list) integrate(id ID, parent *position, v interface{}) (*position, error) {
	// TODO: probably should move this check to the top level document.
	if l.items[id] != nil {
		return nil, fmt.Errorf("position id %v is already integrated in list %s", id, l.id)
	}

	p := &position{
		id:   id,
		ref:  parent.id,
		list: l,
	}

	// Solve interleaving and concurrent inserts by applying RGA algorithm here:
	// 1. We find the ID of the right element of our insertion position.
	// 2. If this ID is greater than ours, then we skip over this element.
	// 3. Repeat this until we find an element which ID is less than ours.
	//
	// Notice that most of the time we will break out of the loop immediately.
	// Only in case of concurrent inserts (the ones with the same ref as ours)
	// we'd skip over them and their causal children.
	for {
		if parent.right == &l.root || parent.Next().id.Less(id) {
			break
		}

		parent = parent.right
	}

	l.insertAfter(id, p, parent)

	p.value = v

	l.items[id] = p

	return p, nil
}

func (l *list) findPos(id ID) (*position, error) {
	p, ok := l.items[id]
	if !ok {
		return nil, fmt.Errorf("position %v not found in list %s", id, l.id)
	}

	return p, nil
}

func (l *list) append(id ID, v interface{}) (*position, error) {
	return l.integrate(id, l.root.left, v)
}

func (l *list) insertAfter(id ID, el *position, left *position) *position {
	// Relink positions.
	el.left = left
	el.right = left.right
	el.left.right = el
	el.right.left = el

	return el
}

// position inside a list CRDT.
type position struct {
	id  ID
	ref ID

	list *list

	left  *position
	right *position

	value interface{}
}

// Prev returns previous position in the linked list. Nil is returned
// when start of the list is reached.
func (pos *position) Prev() *position {
	prev := pos.left

	if prev == &pos.list.root {
		return nil
	}

	return prev
}

// PrevFilled returns the first non-empty position to the left of the current one.
func (pos *position) PrevFilled() *position {
	for left := pos.Prev(); left != nil; left = left.Prev() {
		if left.value != nil {
			return left
		}
	}

	return nil
}

// Next position in the linked list. Nil is returned
// when end of the list is reached.
func (pos *position) Next() *position {
	next := pos.right

	if next == &pos.list.root {
		return nil
	}

	return next
}

// NextFilled returns the first non-empty position to the right of the current one.
func (pos *position) NextFilled() *position {
	for right := pos.Next(); right != nil; right = right.Next() {
		if right.value != nil {
			return right
		}
	}

	return nil
}
