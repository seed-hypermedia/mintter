// Package memory provides an in-memory implementation of kv.Txn.
package memory

import (
	"sort"
	"strings"
	"sync"

	"mintter/backend/kv"
)

// New returns a memory-backed implementation of the kv.Txn interface
// intended exclusively for use in tests, and not in production.
func New() kv.TxnCommitDiscarder {
	return &txn{
		m: make(map[string][]byte),
	}
}

type txn struct {
	m     map[string][]byte
	next  kv.Entity
	mutex sync.Mutex
}

func (s *txn) Alloc() (kv.Entity, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.next++
	return s.next, nil
}

func (s *txn) Get(k []byte, f func([]byte) error) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return f(s.m[string(k)])
}

func (s *txn) Set(k, v []byte) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.m[string(k)] = v
	return nil
}

func (s *txn) Delete(k []byte) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	delete(s.m, string(k))
	return nil
}

func (s *txn) PrefixIterator(prefix []byte) kv.Iterator {
	var iter iterator
	p := string(prefix)
	for k, v := range s.m {
		if strings.HasPrefix(k, p) {
			iter.pairs = append(iter.pairs, pair{
				key:   k[len(p):],
				value: v,
			})
		}
	}
	sort.Slice(
		iter.pairs,
		func(a, b int) bool { return iter.pairs[a].key < iter.pairs[b].key })
	return &iter
}

func (s *txn) Discard()      {}
func (s *txn) Commit() error { return nil }

type pair struct {
	key   string
	value []byte
}

type iterator struct {
	pairs []pair
	i     int
}

func (i *iterator) Seek(key []byte) {
	k := string(key)
	i.i = 0
	for i.i = 0; i.i < len(i.pairs) && i.pairs[i.i].key < k; i.i++ {
	}
}

func (i *iterator) Next() { i.i++ }

func (i *iterator) Valid() bool {
	return 0 <= i.i && i.i < len(i.pairs)
}

func (i *iterator) Key() []byte { return []byte(i.pairs[i.i].key) }

func (i *iterator) Value(f func([]byte) error) error {
	return f(i.pairs[i.i].value)
}

func (i *iterator) Discard() {}
