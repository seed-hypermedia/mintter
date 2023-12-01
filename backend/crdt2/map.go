package crdt2

import (
	"math"
	"sort"

	"github.com/tidwall/btree"
	"golang.org/x/exp/maps"
)

type Map struct {
	state *btree.BTreeG[mapNode]
}

func NewMap() *Map {
	return &Map{
		state: btree.NewBTreeGOptions(
			func(a, b mapNode) bool { return a.key.Less(b.key) },
			btree.Options{NoLocks: true, Degree: 8},
		),
	}
}

func (m *Map) Set(time int64, origin string, path []string, value any) {
	m.setNode(time, origin, path, mapValuePrimitive, value)
}

func (m *Map) ApplyPatch(time int64, origin string, patch map[string]any) (ok bool) {
	if patch == nil {
		return false
	}

	type item struct {
		m    map[string]any
		path []string
	}

	queue := []item{
		{m: patch},
	}

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]

		for k, v := range cur.m {
			vt := mapValuePrimitive
			vm, isMap := v.(map[string]any)
			if isMap {
				// We need to "unwrap" special "tagged" map values.
				// All special maps have 1 key, but not all one-key maps
				// are special, hence this complicated mess.
				// Should improve the readability of this.
				if vv, ok := vm["#list"]; ok && len(vm) == 1 {
					v = vv
					vt = mapValueListChunk
				} else if vv, ok := vm["#map"]; ok && len(vm) == 1 {
					v = vv
					vt = mapValueAtomicMap
				} else if vv, ok := vm["#rga"]; ok && len(vm) == 1 {
					_ = vv
					panic("TODO: implement RGA")
				} else {
					queue = append(queue, item{m: vm, path: append(cur.path, k)})
				}
			}
			m.setNode(time, origin, append(cur.path, k), vt, v)
		}
	}

	return true
}

func (m *Map) setNode(time int64, origin string, path []string, vt mapValueType, value any) {
	mn := mapNode{
		key: mapKey{
			path:   path,
			time:   time,
			origin: origin,
		},
		valueType: vt,
		value:     value,
	}

	m.state.Set(mn)
}

func (m *Map) Get(path ...string) (value any, ok bool) {
	pivot := newPivot(path, true)

	var n mapNode
	m.state.Descend(pivot, func(item mapNode) bool {
		n = item
		return false
	})

	if !samePath(path, n.key.path) {
		return nil, false
	}

	if n.valueType != mapValuePrimitive && n.valueType != mapValueAtomicMap {
		return nil, false
	}

	return n.value, true
}

func (m *Map) GetWithOrigin(path ...string) (value any, origin string, ok bool) {
	pivot := newPivot(path, true)

	var n mapNode
	m.state.Descend(pivot, func(item mapNode) bool {
		n = item
		return false
	})

	if !samePath(path, n.key.path) {
		return nil, "", false
	}

	if n.valueType != mapValuePrimitive && n.valueType != mapValueAtomicMap {
		return nil, "", false
	}

	return n.value, n.key.origin, true
}

func (m *Map) List(path ...string) (out []any, ok bool) {
	pivot := newPivot(path, false)

	m.state.Ascend(pivot, func(item mapNode) bool {
		if item.valueType != mapValueListChunk {
			return false
		}
		if !samePath(path, item.key.path) {
			return false
		}

		chunk := item.value.(map[string]any)
		if chunk["#ins"] == nil {
			panic("TODO: handle non-inserting list chunks")
		}

		out = append(out, chunk["#ins"].([]any)...)
		ok = true
		return true
	})

	return out, ok
}

func (m *Map) Keys(path ...string) []string {
	// Appending empty string to start scanning keys grater than prefix.
	pivot := newPivot(append(path, ""), false)

	keys := map[string]struct{}{}
	m.state.Ascend(pivot, func(item mapNode) bool {
		if !samePath(path, item.key.path[:len(item.key.path)-1]) {
			return false
		}

		keys[item.key.path[len(item.key.path)-1]] = struct{}{}

		return true
	})

	list := maps.Keys(keys)
	sort.Strings(list)

	return list
}

func (m *Map) ForEachListChunk(path []string, fn func(time int64, origin string, items []any) (ok bool)) {
	pivot := newPivot(path, false)

	m.state.Ascend(pivot, func(item mapNode) bool {
		if item.valueType != mapValueListChunk {
			return false
		}
		if !samePath(path, item.key.path) {
			return false
		}

		chunk := item.value.(map[string]any)
		if chunk["#ins"] == nil {
			panic("TODO: handle non-inserting list chunks")
		}

		items := chunk["#ins"].([]any)
		if !fn(item.key.time, item.key.origin, items) {
			return false
		}
		return true
	})
}

func (m *Map) ForgetState(time int64, origin string) {
	var toDelete []mapNode
	m.state.Scan(func(item mapNode) bool {
		if item.key.time == time && item.key.origin == origin {
			toDelete = append(toDelete, item)
		}
		return true
	})

	for _, n := range toDelete {
		if _, ok := m.state.Delete(n); !ok {
			panic("BUG: failed to delete map node")
		}
	}
}

func newPivot(path []string, reverse bool) mapNode {
	t := int64(0)
	if reverse {
		t = math.MaxInt64
	}
	return mapNode{key: mapKey{
		path: path,
		time: t,
	}}
}

type mapNode struct {
	key       mapKey
	valueType mapValueType
	value     any
}

type mapValueType byte

const (
	mapValuePrimitive mapValueType = 0
	mapValueListChunk mapValueType = 1
	mapValueRGAChunk  mapValueType = 2
	mapValueAtomicMap mapValueType = 3
)

type mapKey struct {
	path   []string
	time   int64
	origin string
}

func (mk mapKey) Less(o mapKey) bool {
	a := mk.path
	b := o.path

	n := len(a)
	m := len(b)

	if n < m {
		return true
	}

	if n > m {
		return false
	}

	for i := 0; i < n && i < m; i++ {
		if a[i] < b[i] {
			return true
		}
		if a[i] > b[i] {
			return false
		}
	}

	if mk.time < o.time {
		return true
	}
	if mk.time > o.time {
		return false
	}

	return mk.origin < o.origin
}

func samePath(a, b []string) bool {
	la, lb := len(a), len(b)
	if la != lb {
		return false
	}

	for i := 0; i < la; i++ {
		if a[i] != b[i] {
			return false
		}
	}

	return true
}

// MapValue is a map values that is replaced atomically.
type MapValue[T any] struct {
	Map T `mapstructure:"#map"`
}

// ListValue is a patch value for a list mutation.
type ListValue[T any] struct {
	Insert []T `mapstructure:"#ins"`
}
