package crdt

type stringValue struct {
	ID  ID
	Val string
}

type stringLWW struct {
	values []stringValue
}

func (lww *stringLWW) Set(v stringValue) {
	if len(lww.values) == 0 {
		lww.values = append(lww.values, v)
		return
	}

	last := lww.values[len(lww.values)-1]
	if last.ID.Less(v.ID) {
		lww.values = append(lww.values, v)
		return
	}

	// If the value we are setting is not newer than the last known value
	// we have to scan backwards, find the slot for our new value, and splice the array.
	// This is not very efficient, but actually would only happen if we are merging old values
	// out of order, which is not expected in a non-realtime environment like ours.
	// We start from the second to last element, because we've already checked the last one above.
	for i := len(lww.values) - 2; i >= 0; i-- {
		if v.ID.Less(lww.values[i].ID) {
			continue
		}

		// Splice the array. Make room for a new element and shift the slice.
		lww.values = append(lww.values, stringValue{})
		copy(lww.values[i+1:], lww.values[i:])
		lww.values[i] = v
		return
	}

	panic("BUG: can't append value to the set")
}

func (lww stringLWW) Get() stringValue {
	return lww.values[len(lww.values)-1]
}
