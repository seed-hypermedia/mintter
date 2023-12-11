package colx

import "fmt"

// SliceMap applies a map function to each element of the slice
// and produces a new slice with (possibly) transformed value.
func SliceMap[In any, Out any](in []In, fn func(In) Out) []Out {
	out := make([]Out, len(in))
	for i, v := range in {
		out[i] = fn(v)
	}
	return out
}

// SliceMapErr applies a map function that might return an error.
func SliceMapErr[In any, Out any](in []In, fn func(In) (Out, error)) ([]Out, error) {
	out := make([]Out, len(in))
	for i, v := range in {
		var err error
		out[i], err = fn(v)
		if err != nil {
			return nil, fmt.Errorf("failed to map element %v to type %T: %w", v, *(new(Out)), err)
		}
	}
	return out, nil
}

// SliceDeleteAppend deletes an element shifting the tail using append.
func SliceDeleteAppend[T any](s []T, i int) []T {
	return append(s[:i], s[i+1:]...)
}

// SliceDeleteCopy deletes an element shifting the tail using copy.
func SliceDeleteCopy[T any](s []T, i int) []T {
	return s[:i+copy(s[i:], s[i+1:])]
}

// SliceDeleteUnordered deletes an element without preserving order.
func SliceDeleteUnordered[T any](s []T, i int) []T {
	s[i] = s[len(s)-1]
	return s[:len(s)-1]
}
