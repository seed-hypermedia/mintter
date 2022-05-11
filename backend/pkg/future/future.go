// Package future provides a thread-safe promise-like value which can be used for deferred lazy
// initialization of a value. Value can only ever be set (resolved) once, but can be read many times.
package future

import (
	"context"
	"fmt"
	"sync/atomic"
)

// Value is a future that will eventually will provide a value of T.
// Zero value is NOT useful. Must be created using New().
type Value[T any] struct {
	val  atomic.Value
	done chan struct{}
}

// New creates a new empty future.
func New[T any]() *Value[T] {
	fut := &Value[T]{
		done: make(chan struct{}),
	}
	return fut
}

// Resolve sets value into the future. Can be called
// by many concurrent writers, but only one writer will succeed.
// Which one depends on the runtime scheduler.
func (v *Value[T]) Resolve(val T) error {
	swapped := v.val.CompareAndSwap(nil, val)
	if !swapped {
		return fmt.Errorf("future is already resolved")
	}
	close(v.done)
	return nil
}

// Await blocks until future is resolved or ctx is canceled.
// The error returned is the one from context.
// Many concurrent readers can call Await, and they all will see
// the same value of T whenever future is resolved.
func (v *Value[T]) Await(ctx context.Context) (T, error) {
	select {
	case <-ctx.Done():
		return *new(T), ctx.Err()
	case <-v.done:
		return v.val.Load().(T), nil
	}
}

// Get is a non-blocking attempt to read the value from the future.
// If future is not yet resolved ok will be false.
func (v *Value[T]) Get() (val T, ok bool) {
	vv := v.val.Load()
	if vv == nil {
		return val, ok
	}

	return vv.(T), true
}

// ReadOnly subset of a future Value.
type ReadOnly[T any] interface {
	Await(ctx context.Context) (T, error)
	Get() (val T, ok bool)
}
