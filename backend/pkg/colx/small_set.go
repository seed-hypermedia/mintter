package colx

// SmallSet is a slice-backed set.
// Comes useful when the set is expected to be small,
// and/or when you'd need the slice anyway.
type SmallSet[T comparable] struct {
	s []T
}

// Has checks if v is in the set.
func (ss *SmallSet[T]) Has(v T) bool {
	if ss.s == nil {
		return false
	}

	for _, vv := range ss.s {
		if vv == v {
			return true
		}
	}

	return false
}

// Put adds v to the set.
func (ss *SmallSet[T]) Put(v T) {
	for _, vv := range ss.s {
		if vv == v {
			return
		}
	}

	ss.s = append(ss.s, v)
}

// Delete an element without preserving order.
func (ss *SmallSet[T]) Delete(v T) {
	for i, vv := range ss.s {
		if vv == v {
			ss.s[i] = ss.s[len(ss.s)-1]
			ss.s = ss.s[:len(ss.s)-1]
			return
		}
	}
}

// Slice returns the underlying slice.
func (ss *SmallSet[T]) Slice() []T {
	return ss.s
}
