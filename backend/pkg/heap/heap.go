// Package heap provides a generic minimal binary heap data structure.
// It's mostly adaptation of the stdlib container/heap package, removing
// the quirks that were necessary before generics existed in the language.
package heap

// Heap is a binary heap data structure. Zero value is not useful,
// must be initialized using New().
type Heap[T any] struct {
	data     []T
	lessFunc func(i, j T) bool
	// OnSwap will be called (if set) before swapping elements.
	// It must not actually swap! It can be used only to record the resulting indices
	// inside the data slice in order to call Remove() or Fix() afterwards.
	OnSwap func(data []T, i, j int)
}

// New creates a new heap using the comparator function less.
func New[T any](less func(T, T) bool) *Heap[T] {
	return &Heap[T]{
		lessFunc: less,
	}
}

// Reset the heap backing slice to the given size. Can be used when size of elements is known beforehand.
// THe size is not the hard limit, the backing slice will expand as needed.
func (h *Heap[T]) Reset(size int) *Heap[T] {
	h.data = make([]T, 0, size)
	return h
}

// Push pushes the element x onto the heap.
// The complexity is O(log n) where n = h.Len().
func (h *Heap[T]) Push(x T) {
	h.data = append(h.data, x)
	h.up(h.Len() - 1)
}

// Peek returns "minimal" element from the heap without poping it.
func (h *Heap[T]) Peek() T {
	return h.data[0]
}

// Pop removes and returns the minimum element (according to Less) from the heap.
// The complexity is O(log n) where n = h.Len().
// Pop is equivalent to Remove(h, 0).
func (h *Heap[T]) Pop() T {
	n := h.Len() - 1
	h.swap(0, n)
	h.down(0, n)
	return h.pop()
}

func (h *Heap[T]) pop() T {
	n := len(h.data)
	item := h.data[n-1]
	h.data[n-1] = *new(T) // avoid memory leak
	h.data = h.data[:len(h.data)-1]
	return item
}

// Remove removes and returns the element at index i from the heap.
// The complexity is O(log n) where n = h.Len().
func (h *Heap[T]) Remove(i int) any {
	n := h.Len() - 1
	if n != i {
		h.swap(i, n)
		if !h.down(i, n) {
			h.up(i)
		}
	}
	return h.pop()
}

// Fix re-establishes the heap ordering after the element at index i has changed its value.
// Changing the value of the element at index i and then calling Fix is equivalent to,
// but less expensive than, calling Remove(h, i) followed by a Push of the new value.
// The complexity is O(log n) where n = h.Len().
func (h *Heap[T]) Fix(i int) {
	if !h.down(i, h.Len()) {
		h.up(i)
	}
}

// Len returns number of items in the heap.
func (h *Heap[T]) Len() int { return len(h.data) }

func (h *Heap[T]) less(i, j int) bool {
	return h.lessFunc(h.data[i], h.data[j])
}

func (h *Heap[T]) swap(i, j int) {
	h.data[i], h.data[j] = h.data[j], h.data[i]
}

func (h *Heap[T]) up(j int) {
	for {
		i := (j - 1) / 2 // parent
		if i == j || !h.less(j, i) {
			break
		}
		h.swap(i, j)
		j = i
	}
}

func (h *Heap[T]) down(i0, n int) bool {
	i := i0
	for {
		j1 := 2*i + 1
		if j1 >= n || j1 < 0 { // j1 < 0 after int overflow
			break
		}
		j := j1 // left child
		if j2 := j1 + 1; j2 < n && h.less(j2, j1) {
			j = j2 // = 2*i + 2  // right child
		}
		if !h.less(j, i) {
			break
		}
		h.swap(i, j)
		i = j
	}
	return i > i0

}
