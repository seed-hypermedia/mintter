package sqlitevcs

// DatomWriter collects datoms to be written or deleted.
type DatomWriter struct {
	change      LocalID
	lamportTime int
	seq         int

	dirty   []Datom
	deleted map[OpID]struct{}
}

// NewDatomWriter creates a new DatomWriter for a given change, its
// lamport timestamp, and initial seq. Seq gets incremented *before*
// the new datom is created, i.e. pass seq = 0 for the very first datom.
func NewDatomWriter(change LocalID, lamportTime, seq int) *DatomWriter {
	return &DatomWriter{
		change:      change,
		lamportTime: lamportTime,
		seq:         seq,

		deleted: map[OpID]struct{}{},
	}
}

// NewAndAdd creates a new Datom and tracks it.
func (dw *DatomWriter) NewAndAdd(entity NodeID, a Attribute, value any) Datom {
	dw.seq++
	d := NewDatom(dw.change, dw.seq, entity, a, value, dw.lamportTime)
	dw.AddDatom(d)
	return d
}

// AddDatom adds a prepared Datom to be written. Sometimes we create datoms,
// but we won't end up writing them into the database for various reasons.
func (dw *DatomWriter) AddDatom(dd ...Datom) {
	dw.dirty = append(dw.dirty, dd...)
}

// NewDatom creates a new Datom and records the timestamp.
func (dw *DatomWriter) NewDatom(entity NodeID, a Attribute, value any) Datom {
	dw.seq++
	d := NewDatom(dw.change, dw.seq, entity, a, value, dw.lamportTime)
	return d
}

// DeleteDatom records datoms to be deleted.
func (dw *DatomWriter) DeleteDatom(id OpID) {
	dw.deleted[id] = struct{}{}
}

// Dirty returns datoms to be written.
func (dw *DatomWriter) Dirty() []Datom {
	return dw.dirty
}

// Deleted returns datoms to be deleted.
func (dw *DatomWriter) Deleted() map[OpID]struct{} {
	return dw.deleted
}
