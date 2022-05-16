package slices

func Splice[S ~[]V, V any](s S, i int, v V) S {
	s = append(s, *new(V))
	copy(s[i+1:], s[i:])
	s[i] = v
	return s
}

func Concat[S ~[]V, V any](s ...S) S {
	var out S

	for _, ss := range s {
		for _, val := range ss {
			out = append(out, val)
		}
	}

	return out
}
