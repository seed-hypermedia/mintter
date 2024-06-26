package rbsr

import (
	"errors"
	"sort"

	"golang.org/x/exp/slices"
)

// Store is the interface to the dataset.
type Store interface {
	Size() int
	Insert(ts int64, data []byte) error
	ForEach(start, end int, fn func(i int, item Item) bool) error
	FindLowerBound(startHint int, value Item) (int, error)
	Seal() error
}

// sliceStore implements Storage backed by a slice.
type sliceStore struct {
	items  []Item
	sealed bool
}

// NewSliceStore creates a store instance that is backed by a slice.
func NewSliceStore() Store {
	return &sliceStore{
		items:  make([]Item, 0),
		sealed: false,
	}
}

func (v *sliceStore) Insert(createdAt int64, id []byte) error {
	if v.sealed {
		return errors.New("already sealed")
	}

	item := NewItem(createdAt, id)

	v.items = append(v.items, item)
	return nil
}

func (v *sliceStore) InsertItem(item Item) error {
	return v.Insert(item.Timestamp, item.Value[:])
}

func (v *sliceStore) Seal() error {
	if v.sealed {
		return errors.New("already sealed")
	}
	v.sealed = true

	slices.SortFunc(v.items, func(a, b Item) int {
		x := a.Cmp(b)
		if x == 0 {
			panic("BUG: duplicate items in store when sealing")
		}
		return x
	})

	return nil
}

func (v *sliceStore) Unseal() {
	v.sealed = false
}

func (v *sliceStore) Size() int {
	if err := v.checkSealed(); err != nil {
		return 0
	}
	return len(v.items)
}

func (v *sliceStore) ForEach(start, end int, fn func(int, Item) bool) error {
	if err := v.checkSealed(); err != nil {
		return err
	}

	if err := v.checkBounds(start, end); err != nil {
		return err
	}

	for i := start; i < end; i++ {
		if !fn(i, v.items[i]) {
			break
		}
	}
	return nil
}

func (v *sliceStore) FindLowerBound(startHint int, bound Item) (int, error) {
	if err := v.checkSealed(); err != nil {
		return 0, err
	}
	if err := v.checkBounds(startHint, len(v.items)); err != nil {
		return 0, err
	}

	i := sort.Search(len(v.items[startHint:]), func(i int) bool {
		return v.items[startHint+i].Cmp(bound) >= 0
	})
	return startHint + i, nil
}

func (v *sliceStore) checkSealed() error {
	if !v.sealed {
		return errors.New("not sealed")
	}
	return nil
}

func (v *sliceStore) checkBounds(begin, end int) error {
	if begin > end || end > len(v.items) {
		return errors.New("bad range")
	}
	return nil
}
