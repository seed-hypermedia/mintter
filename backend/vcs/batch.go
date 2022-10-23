package vcs

import (
	"mintter/backend/vcs/crdt"
	"mintter/backend/vcs/hlc"
)

// Batch is a mutation
// that collects datoms
// to be created or deleted.
type Batch struct {
	clock  *hlc.Clock
	origin uint64

	new     []Datom
	deleted map[crdt.OpID]struct{}
}

// NewBatch creates a new batch.
func NewBatch(c *hlc.Clock, origin uint64) *Batch {
	return &Batch{
		clock:  c,
		origin: origin,
	}
}

// New creates a new datom without adding it to the batch.
func (b *Batch) New(e NodeID, a Attribute, value any) Datom {
	return NewDatom(e, a, value, b.clock.Now().Pack(), b.origin)
}

// Add a new datom to the batch.
func (b *Batch) Add(e NodeID, a Attribute, value any) Datom {
	d := NewDatom(e, a, value, b.clock.Now().Pack(), b.origin)
	b.AddDatom(d)
	return d
}

// AddDatom that was created previously.
func (b *Batch) AddDatom(d ...Datom) {
	b.new = append(b.new, d...)
}

// Delete datom. Care needs to be taken to only delete datoms
// from changes that are drafts and are not yet published.
func (b *Batch) Delete(id crdt.OpID) {
	if b.deleted == nil {
		b.deleted = make(map[crdt.OpID]struct{})
	}
	b.deleted[id] = struct{}{}
}

// Dirty returns the list of datoms to be inserted.
func (b *Batch) Dirty() []Datom {
	return b.new
}

// Deleted returns the set of datoms to be deleted.
func (b *Batch) Deleted() map[crdt.OpID]struct{} {
	return b.deleted
}
