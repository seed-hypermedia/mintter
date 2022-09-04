package mttdoc

import (
	"mintter/backend/vcs/crdt"
	"mintter/backend/vcs/vcsdb"
)

type Iterator struct {
	doc   *Document
	stack []*crdt.ListElement[BlockPosition]
}

// Iterator creates a new document iterator to walk the document
// hierarchy of content blocks in depth-first order.
func (doc *Document) Iterator() *Iterator {
	l, ok := doc.children[vcsdb.RootNode]
	if !ok {
		panic("BUG: must have top-level root list of children")
	}

	return &Iterator{
		doc:   doc,
		stack: []*crdt.ListElement[BlockPosition]{l.Root().NextAlive()},
	}
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
