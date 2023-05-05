package crdt2

import (
	"math"

	"github.com/tidwall/btree"
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
	mn := mapNode{
		key: mapKey{
			path:   path,
			time:   time,
			origin: origin,
		},
		valueType: mapValuePrimitive,
		value:     value,
	}

	m.state.Set(mn)
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
				if len(vm) == 1 {
					if vv, ok := vm["#list"]; ok {
						v = vv
						vt = mapValueListChunk
					}

					if vv, ok := vm["#map"]; ok {
						v = vv
						vt = mapValueAtomicMap
					}

					if vv, ok := vm["#rga"]; ok {
						_ = vv
						panic("TODO: implement RGA")
					}
				} else {
					queue = append(queue, item{m: vm, path: append(cur.path, k)})
				}
			}
			m.state.Set(mapNode{
				key: mapKey{
					path:   append(cur.path, k),
					time:   time,
					origin: origin,
				},
				valueType: vt,
				value:     v,
			})
		}
	}

	return true
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

	if n.valueType != mapValuePrimitive {
		return nil, false
	}

	return n.value, true
}

func (m *Map) List(path ...string) (out []any, ok bool) {
	pivot := newPivot(path, false)

	m.state.Ascend(pivot, func(item mapNode) bool {
		if !samePath(path, item.key.path) {
			return false
		}

		if item.valueType != mapValueListChunk {
			return true
		}

		out = append(out, item.value.([]any)...)
		ok = true
		return true
	})

	return out, ok
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
