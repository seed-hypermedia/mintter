package crdt

// LWW is a last-writer-wins value.
type LWW[T any] struct {
	ID    ID
	Value T
}

// Set the value if it's newer.
func (lww *LWW[T]) Set(site string, clock int64, v T) {
	id := ID{Origin: site, Clock: int(clock)}
	if lww.ID.Less(id) {
		lww.ID = id
		lww.Value = v
	}
}
