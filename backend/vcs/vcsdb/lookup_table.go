package vcsdb

type lookupTable[T comparable] struct {
	cache  []T
	lookup map[T]int
}

func (ic *lookupTable[T]) Put(v T) int {
	if ic.lookup == nil {
		ic.lookup = make(map[T]int)
	}

	n, ok := ic.lookup[v]
	if ok {
		return n
	}

	n = len(ic.cache)
	ic.lookup[v] = n
	ic.cache = append(ic.cache, v)
	return n
}

type lookup[K comparable, V any] struct {
	cache  []V
	lookup map[K]int
}

func (ic *lookup[K, V]) Put(key K, value V) int {
	if ic.lookup == nil {
		ic.lookup = make(map[K]int)
	}

	n, ok := ic.lookup[key]
	if ok {
		return n
	}

	n = len(ic.cache)
	ic.lookup[key] = n
	ic.cache = append(ic.cache, value)
	return n
}
