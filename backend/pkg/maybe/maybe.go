// Package maybe provides an optional value type.
package maybe

// Value is a wrapper for an optional value.
type Value[T any] struct {
	set   bool
	value T
}

// New creates a new optional value.
func New[T any](v T) Value[T] {
	return Value[T]{set: true, value: v}
}

// IsSet returns true if the value is set.
func (v Value[T]) IsSet() bool {
	return v.set
}

// Any returns value if it's set, otherwise returns nil.
func (v Value[T]) Any() any {
	if v.set {
		return v.value
	}

	return nil
}

// Any converts concrete value to an any, using nil is the concrete value is a zero value.
func Any[T comparable](v T) any {
	if v == *(new(T)) {
		return nil
	}

	return v
}

// AnySlice converts a slice to an any, using nil if the slice is empty.
func AnySlice[T any](v []T) any {
	if len(v) == 0 {
		return nil
	}

	return v
}
