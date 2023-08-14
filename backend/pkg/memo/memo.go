// Package memo provides a simple memoization/caching library.
package memo

// Memo remembers values returned by a function.
type Memo[K comparable, V any] struct {
	m  map[K]V
	fn func(K) (V, error)
}

// New creates a new Memo.
func New[K comparable, V any](fn func(K) (V, error)) *Memo[K, V] {
	return &Memo[K, V]{
		m:  make(map[K]V),
		fn: fn,
	}
}

// Get returns the value for the given key calling the function if necessary.
func (m *Memo[K, V]) Get(k K) (V, error) {
	v, ok := m.m[k]
	if !ok {
		v, err := m.fn(k)
		if err != nil {
			return *new(V), err
		}
		m.m[k] = v
	}

	return v, nil
}

// MustGet is like Get but panics on error.
func (m *Memo[K, V]) MustGet(k K) V {
	v, err := m.Get(k)
	if err != nil {
		panic(err)
	}
	return v
}
