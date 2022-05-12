// Package future provides a thread-safe promise-like value which can be used for deferred lazy
// initialization of a value. Value can only ever be set (resolved) once, but can be read many times.
package future

import (
	"context"
	"fmt"
	"sync/atomic"
)

// Value is a promise-like future that will eventually will provide a value of T.
// Zero value is NOT useful. Must be created using New(). Thread-safe.
type Value[T any] struct {
	*ReadOnly[T]
}

// New creates a new empty future.
func New[T any]() Value[T] {
	ro := &ReadOnly[T]{
		done: make(chan struct{}),
	}

	return Value[T]{ReadOnly: ro}
}

// Resolve sets value into the future. Can be called
// by many concurrent writers, but only one writer will succeed.
// Which one depends on the runtime scheduler.
func (v *Value[T]) Resolve(val T) error {
	swapped := v.ReadOnly.val.CompareAndSwap(nil, val)
	if !swapped {
		return fmt.Errorf("future is already resolved")
	}
	close(v.ReadOnly.done)
	return nil
}

// ReadOnly is a read only subset of a future.
type ReadOnly[T any] struct {
	val  atomic.Value
	done chan struct{}
}

// Await blocks until future is resolved or ctx is canceled.
// The error returned is the one from context.
// Many concurrent readers can call Await, and they all will see
// the same value of T whenever future is resolved.
func (v *ReadOnly[T]) Await(ctx context.Context) (T, error) {
	select {
	case <-ctx.Done():
		return *new(T), ctx.Err()
	case <-v.done:
		return v.val.Load().(T), nil
	}
}

// Get is a non-blocking attempt to read the value from the future.
// If future is not yet resolved ok will be false.
func (v *ReadOnly[T]) Get() (val T, ok bool) {
	vv := v.val.Load()
	if vv == nil {
		return val, ok
	}

	return vv.(T), true
}

// MustGet is like Get, but panics if future is not yet resolved.
func (v *ReadOnly[T]) MustGet() T {
	vv, ok := v.Get()
	if !ok {
		panic("future is not resolved yet")
	}

	return vv
}
