package slices

func Splice[S ~[]V, V any](s S, i int, v V) S {
	s = append(s, *new(V))
	copy(s[i+1:], s[i:])
	s[i] = v
	return s
}
