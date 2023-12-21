package colx

// HashSet is a map-backed set.
// Zero value is useful.
type HashSet[T comparable] struct {
	m map[T]struct{}
}

// Has checks if v is in the set.
func (hs *HashSet[T]) Has(v T) bool {
	if hs.m == nil {
		return false
	}
	_, ok := hs.m[v]
	return ok
}

// Put adds v to the set.
func (hs *HashSet[T]) Put(v T) {
	if hs.m == nil {
		hs.m = make(map[T]struct{})
	}

	hs.m[v] = struct{}{}
}

// PutMany adds multiple values to the set.
func (hs *HashSet[T]) PutMany(v []T) {
	if hs.m == nil {
		hs.m = make(map[T]struct{})
	}

	for _, x := range v {
		hs.m[x] = struct{}{}
	}
}

// Delete removes v from the set.
func (hs *HashSet[T]) Delete(v T) {
	if hs.m == nil {
		return
	}

	delete(hs.m, v)
}

// Map returns the underlying map.
func (hs *HashSet[T]) Map() map[T]struct{} {
	return hs.m
}

// Slice returns values from the set as a slice.
func (hs *HashSet[T]) Slice() []T {
	if hs.m == nil {
		return nil
	}

	s := make([]T, 0, len(hs.m))
	for v := range hs.m {
		s = append(s, v)
	}

	return s
}
