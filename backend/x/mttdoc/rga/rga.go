// Package rga is a WIP implementation of RGA.
// Mostly it's a port of https://github.com/josephg/reference-crdts using semantics of Automerge.
package rga

import (
	"strings"
)

var root = atom{}

type ID struct {
	Site  string
	Clock int
}

type atom struct {
	ID    ID
	Ref   ID
	Value rune
}

type RGA struct {
	content  []atom
	lastSeen map[string]int
	maxClock int
}

func newRGA() *RGA {
	return &RGA{
		content:  []atom{root},
		lastSeen: map[string]int{},
	}
}

func (r *RGA) Insert(a atom) {
	if r.lastSeen[a.ID.Site] > a.ID.Clock {
		panic("ops out of order")
	}

	if r.lastSeen[a.Ref.Site] < a.Ref.Clock {
		panic("missing deps")
	}

	parent := r.findItem(a.Ref)
	if parent == -1 {
		panic("ref not found")
	}
	dest := parent + 1

	// Scan for the insert location. Stop if we reach the end of the document
	for ; dest < len(r.content); dest++ {
		o := r.content[dest]

		// This is an unnecessary optimization (I couldn't help myself). It
		// doubles the speed when running the local editing traces by
		// avoiding calls to findItem() below.
		if a.ID.Clock > o.ID.Clock {
			break
		}

		// Optimization: This call halves the speed of this automerge
		// implementation. Its only needed to see if o.originLeft has been
		// visited in this loop, which we could calculate much more
		// efficiently.
		oparent := r.findItemReverse(o.Ref, dest-1)

		// Ok now we implement the punnet square of behavior.

		// We've gotten to the end of the list of children. Stop here.
		if oparent < parent {
			break
		}

		// Concurrent items from different sites are sorted first by seq then agent.
		//
		// NOTE: For consistency with the other algorithms, adjacent items
		// are sorted in *ascending* order of useragent rather than
		// *descending* order as in the actual automerge. It doesn't
		// matter for correctness, but its something to keep in mind if
		// compatibility matters. The reference checker inverts AM client
		// ids.
		if oparent == parent && (a.ID.Clock == o.ID.Clock) && a.ID.Site < o.ID.Site {
			break
		}
	}

	// Make room for the new element, shift the tail
	// and insert in our disired position.
	r.content = append(r.content, atom{})
	copy(r.content[dest+1:], r.content[dest:])
	r.content[dest] = a

	r.lastSeen[a.ID.Site] = a.ID.Clock
	if r.maxClock < a.ID.Clock {
		r.maxClock = a.ID.Clock
	}
}

func (r *RGA) findItem(needle ID) int {
	for i, a := range r.content {
		if a.ID == needle {
			return i
		}
	}

	panic("find item failed")
}

func (r *RGA) findItemReverse(needle ID, idx int) int {
	for ; idx >= 0; idx-- {
		a := r.content[idx]
		if a.ID == needle {
			return idx
		}
	}

	panic("find item reverse failed")
}

func (r *RGA) String() string {
	var b strings.Builder
	for _, r := range r.content[1:] {
		b.WriteRune(r.Value)
	}
	return b.String()
}
