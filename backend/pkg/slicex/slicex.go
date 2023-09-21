// Package slicex provides utility function for working with slices,
// that are not found in the stdlib slices package.
package slicex

import "fmt"

// Map applies a map function to each element of the slice
// and produces a new slice with (possibly) transformed value.
func Map[In any, Out any](in []In, fn func(In) Out) []Out {
	out := make([]Out, len(in))
	for i, v := range in {
		out[i] = fn(v)
	}
	return out
}

// MapE applies a map function that might return an error.
func MapE[In any, Out any](in []In, fn func(In) (Out, error)) ([]Out, error) {
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

// MapSet is a set-like map.
type MapSet[T comparable] map[T]struct{}

// Slice returns a slice of each element in the set.
// The order of the elements is undefined, because
// the order of keys in the map is also undefined.
func (ms MapSet[T]) Slice() []T {
	out := make([]T, 0, len(ms))
	for k := range ms {
		out = append(out, k)
	}
	return out
}

// Set converts elements of a slice into a simple map-based set.
func Set[T comparable](in []T) MapSet[T] {
	out := make(MapSet[T], len(in))
	for _, v := range in {
		out[v] = struct{}{}
	}
	return out
}
