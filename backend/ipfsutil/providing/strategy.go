package providing

import (
	"context"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore/query"
)

// Iterator that returns CIDs to be reprovided. It's not safe for concurrent use.
type Iterator struct {
	c   <-chan cid.Cid
	res query.Result

	cur    cid.Cid
	pos    int
	closed bool
}

// Next retrieves and prepares next item.
func (it *Iterator) Next(ctx context.Context) {
	// TODO get next item
	if it.c != nil {
		c, ok := <-it.c
		if !ok {
			it.closed = true
			return
		}
		_ = c
	}
	it.pos++
}

// Valid checks wether iterator is still valid.
func (it *Iterator) Valid() bool {
	return !it.closed
}

// Item returns item on the current position of the iterator.
func (it *Iterator) Item() cid.Cid {
	return it.cur
}

// Strategy is a factory function that creates an iterator for providing CIDs.
type Strategy func() *Iterator
