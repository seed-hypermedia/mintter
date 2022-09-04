package crdt

import (
	"fmt"
)

// ListStart indicates a start position in the list.
var ListStart = OpID{}

// RGA is a Replicated Growable Array CRDT.
type RGA[T any] struct {
	isLess LessFunc
	items  map[OpID]*ListElement[T]
	root   ListElement[T]
}

// NewRGA creates a new list CRDT instance.
func NewRGA[T any](less LessFunc) *RGA[T] {
	l := &RGA[T]{
		isLess: less,
		items:  map[OpID]*ListElement[T]{},
	}

	l.root.left = &l.root
	l.root.right = &l.root
	l.items[ListStart] = &l.root
	l.root.list = l

	return l
}

// Insert an operation into the list.
func (l *RGA[T]) Insert(id, ref OpID, value T) (*ListElement[T], error) {
	refPos, err := l.findPos(ref)
	if err != nil {
		return nil, err
	}

	return l.integrate(id, refPos, value)
}

// Delete element from the list. Elements are marked as deleted only,
// not actually removed, to allow merging outdated elements.
func (l *RGA[T]) Delete(el *ListElement[T]) error {
	if el.list != l {
		return fmt.Errorf("element doesn't belong to the list")
	}

	el.deleted = true

	return nil
}

// InsertAfter a known list element. If ref is nil, prepend to the front of the list.
func (l *RGA[T]) InsertAfter(id OpID, ref *ListElement[T], value T) (*ListElement[T], error) {
	return l.integrate(id, ref, value)
}

// Append to the end of the list.
func (l *RGA[T]) Append(id OpID, v T) (*ListElement[T], error) {
	return l.integrate(id, l.root.left, v)
}

// GetElement by ID.
func (l *RGA[T]) GetElement(id OpID) (*ListElement[T], error) {
	el, ok := l.items[id]
	if !ok {
		return nil, fmt.Errorf("position %v not found in list", id)
	}
	return el, nil
}

// Root returns the sentinel root element of the list.
// Useful to start iterating over elements.
func (l *RGA[T]) Root() *ListElement[T] {
	return &l.root
}

func (l *RGA[T]) integrate(id OpID, ref *ListElement[T], value T) (*ListElement[T], error) {
	if l.items[id] != nil {
		return nil, fmt.Errorf("position id %v is already integrated in list", id)
	}

	if ref.list != l {
		return nil, fmt.Errorf("ref doesn't belong to this list")
	}

	p := &ListElement[T]{
		id:   id,
		ref:  ref.id,
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
		if ref.right == &l.root || l.isLess(ref.Next().id, id) {
			break
		}

		ref = ref.right
	}

	l.insertAfter(p, ref)

	p.value = value

	l.items[id] = p

	return p, nil
}

func (l *RGA[T]) insertAfter(el *ListElement[T], left *ListElement[T]) *ListElement[T] {
	// Relink positions.
	el.left = left
	el.right = left.right
	el.left.right = el
	el.right.left = el

	return el
}

func (l *RGA[T]) findPos(id OpID) (*ListElement[T], error) {
	p, ok := l.items[id]
	if !ok {
		return nil, fmt.Errorf("position %v not found", id)
	}

	return p, nil
}

// ListElement inside a list CRDT.
type ListElement[T any] struct {
	id  OpID
	ref OpID

	list *RGA[T]

	left  *ListElement[T]
	right *ListElement[T]

	value T

	deleted bool
}

// ID of the current lest element.
func (pos *ListElement[T]) ID() OpID { return pos.id }

// Value attached to the list element.
func (pos *ListElement[T]) Value() T { return pos.value }

// IsDeleted checks if list element is marked as deleted.
func (pos *ListElement[T]) IsDeleted() bool { return pos.deleted }

// Prev returns previous position in the linked list. Nil is returned
// when start of the list is reached.
func (pos *ListElement[T]) Prev() *ListElement[T] {
	prev := pos.left

	if prev == &pos.list.root {
		return nil
	}

	return prev
}

// PrevAlive returns the first non-deleted element to the left of the current one.
func (pos *ListElement[T]) PrevAlive() *ListElement[T] {
	for left := pos.Prev(); left != nil; left = left.Prev() {
		if !left.deleted {
			return left
		}
	}

	return nil
}

// Next position in the linked list. Nil is returned
// when end of the list is reached.
func (pos *ListElement[T]) Next() *ListElement[T] {
	next := pos.right

	if next == &pos.list.root {
		return nil
	}

	return next
}

// NextAlive returns the first non-deleted element to the right of the current one.
func (pos *ListElement[T]) NextAlive() *ListElement[T] {
	for right := pos.Next(); right != nil; right = right.Next() {
		if !right.deleted {
			return right
		}
	}

	return nil
}

// MarkDeleted marks the list element as deleted.
func (pos *ListElement[T]) MarkDeleted() {
	pos.deleted = true
}
