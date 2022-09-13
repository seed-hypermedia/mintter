package slices

// Splice adds value v at index i by splitting the slice and shifting elements to the right.
func Splice[S ~[]V, V any](s S, i int, v V) S {
	s = append(s, *new(V))
	copy(s[i+1:], s[i:])
	s[i] = v
	return s
}

// Concat slices into one slice.
func Concat[S ~[]V, V any](s ...S) S {
	var out S

	for _, ss := range s {
		for _, val := range ss {
			out = append(out, val)
		}
	}

	return out
}
