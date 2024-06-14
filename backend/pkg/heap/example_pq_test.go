// This example demonstrates a priority queue built using the heap interface.
package heap_test

import (
	"fmt"
	"seed/backend/pkg/heap"
)

// An Item is something we manage in a priority queue.
type Item struct {
	value    string // The value of the item; arbitrary.
	priority int    // The priority of the item in the queue.
	// The index is needed by update and is maintained by the heap.Interface methods.
	index int // The index of the item in the heap.
}

type PriorityQueue struct {
	heap.Heap[*Item]
}

func NewQueue() *PriorityQueue {
	h := heap.New(func(i, j *Item) bool { return i.priority > j.priority })
	h.OnSwap = func(data []*Item, i, j int) {
		// Record the indices of the swapped elements.
		data[i].index = i
		data[j].index = j
	}

	return &PriorityQueue{
		Heap: *h,
	}
}

func (pq *PriorityQueue) Pop() *Item {
	it := pq.Heap.Pop()
	it.index = -1
	return it
}

func (pq *PriorityQueue) Push(item *Item) {
	item.index = -1
	pq.Heap.Push(item)
	if item.index == -1 {
		item.index = pq.Heap.Len() - 1
	}
}

// update modifies the priority and value of an Item in the queue.
func (pq *PriorityQueue) update(item *Item, value string, priority int) {
	item.value = value
	item.priority = priority
	pq.Fix(item.index)
}

// This example creates a PriorityQueue with some items, adds and manipulates an item,
// and then removes the items in priority order.
func Example_priorityQueue() {
	// Some items and their priorities.
	items := map[string]int{
		"banana": 3, "apple": 2, "pear": 4,
	}

	// Create a priority queue, put the items in it, and
	// establish the priority queue (heap) invariants.
	pq := NewQueue()
	for value, priority := range items {
		pq.Push(&Item{
			value:    value,
			priority: priority,
		})
	}

	// Insert a new item and then modify its priority.
	item := &Item{
		value:    "orange",
		priority: 1,
	}
	pq.Push(item)
	pq.update(item, item.value, 5)

	// Take the items out; they arrive in decreasing priority order.
	for pq.Len() > 0 {
		item := pq.Pop()
		fmt.Printf("%.2d:%s ", item.priority, item.value)
	}
	// Output:
	// 05:orange 04:pear 03:banana 02:apple
}
