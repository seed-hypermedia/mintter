package mttdoc

type iterator struct {
	stack []*list
	pos   []int
}

func newIterator(d *doc) *iterator {
	return &iterator{
		stack: []*list{d.list()},
		pos:   []int{0},
	}
}

// Next returns the next block of the document in depth-first order.
func (it *iterator) Next() *block {
	if len(it.stack) == 0 {
		return nil
	}

	idx := len(it.stack) - 1

	b := it.stack[idx].Children[it.pos[idx]]
	it.pos[idx]++

	if len(it.stack[idx].Children) == it.pos[idx] {
		it.stack = it.stack[:idx]
		it.pos = it.pos[:idx]
	}

	if b.Children != nil {
		it.stack = append(it.stack, b.Children)
		it.pos = append(it.pos, 0)
	}

	return b
}
