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
	items map[ID]*Position
	root  Position
}

func newList(lid string) *list {
	l := &list{
		id:    lid,
		items: map[ID]*Position{},
	}

	l.root.left = &l.root
	l.root.right = &l.root
	l.items[listStart] = &l.root
	l.items[listEnd] = &l.root
	l.root.list = l

	return l
}

func (l *list) integrate(id ID, parent *Position, v interface{}) (*Position, error) {
	// TODO: probably should move this check to the top level document.
	if l.items[id] != nil {
		return nil, fmt.Errorf("position id %v is already integrated in list %s", id, l.id)
	}

	p := &Position{
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
		if parent.right == &l.root || parent.right.id.Less(id) {
			break
		}

		parent = parent.right
	}

	l.insertAfter(id, p, parent)

	p.value = v

	l.items[id] = p

	return p, nil
}

func (l *list) findPos(id ID) (*Position, error) {
	p, ok := l.items[id]
	if !ok {
		return nil, fmt.Errorf("position %v not found in list %s", id, l.id)
	}

	return p, nil
}

func (l *list) append(id ID, v interface{}) (*Position, error) {
	return l.integrate(id, l.root.left, v)
}

func (l *list) insertAfter(id ID, el *Position, left *Position) *Position {
	// Relink positions.
	el.left = left
	el.right = left.right
	el.left.right = el
	el.right.left = el

	return el
}

// Position inside a list CRDT.
type Position struct {
	id  ID
	ref ID

	list *list

	left  *Position
	right *Position

	value interface{}
}

// ID of the position.
func (pos *Position) ID() ID {
	return pos.id
}

// Value assigned to the position.
func (pos *Position) Value() interface{} {
	return pos.value
}
