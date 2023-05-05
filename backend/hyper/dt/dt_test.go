package dt

import (
	"fmt"
	"mintter/backend/crdt"
	"testing"

	"github.com/armon/go-radix"
	"github.com/davecgh/go-spew/spew"
	"github.com/tidwall/btree"
)

func TestUtil(t *testing.T) {
	o := NewObject()

	c1 := &Change{
		Hash: "h1",
		Data: MergePatch{
			"name": "Hello!",
		},
		Ts: 1,
	}

	c2 := &Change{
		Hash: "h2",
		Data: MergePatch{
			"name": "Hello World!",
		},
		Ts:   2,
		Deps: []Hash{c1.Hash},
	}

	o.MustApplyChange(c1)
	o.MustApplyChange(c2)
}

type Change struct {
	Hash Hash
	Data MergePatch
	Ts   int64
	Deps []Hash
}

type Ptr struct {
	Hash Hash
	Idx  int
}

type Hash string

type Key string

type MergePatch map[string]any

type mergeCtx struct {
	mt     mergeType
	ts     int64
	origin Hash
}

type WalkCallback func(path []string, mctx mergeCtx, value any) (ok bool)

func (mp MergePatch) Walk(ts int64, origin Hash, fn WalkCallback) {
	mctx := mergeCtx{ts: ts, origin: origin}
	walkHelper(map[string]any(mp), nil, mctx, fn)
}

func walkHelper(v any, path []string, mctx mergeCtx, fn WalkCallback) (ok bool) {
	mt := checkMergeType(v)

	val, ok := v.(map[string]any)
	if ok && mt == mergeTypeRecursive {
		for k, v := range val {
			newPath := append(path, k)
			if !walkHelper(v, newPath, mctx, fn) {
				return false
			}
		}
		return true
	}

	if mt == mergeTypeRecursive {
		panic("BUG: calling callback for recursive value")
	}
	nctx := mctx
	nctx.mt = mt
	return fn(path, nctx, v)
}

func TestWalk(t *testing.T) {
	in := map[string]any{
		"one": "hey",
		"two": "ho",
		"nested": map[string]any{
			"fooKey": "foo",
			"nested": map[string]any{
				"bool": true,
				"moves": map[string]any{
					"#rga": []map[string]any{
						{
							"#ref": "huyna",
							"#ins": []string{"a", "b", "c", "d"},
						},
						{
							"#ref": "huyna-2",
							"#ins": []string{"foo", "bar", "baz"},
						},
					},
				},
			},
			"barKey": "bar",
		},
		"ok": true,
	}

	state := map[string]any{}

	mergeFunc := func(path []string, mctx mergeCtx, v any) bool {
		if mctx.mt == mergeTypeRecursive {
			panic("NO RECURSIVE")
		}
		if len(path) == 0 {
			panic("NO PATH")
		}

		if mctx.mt != mergeTypeRGA {
			cur := state
			last := len(path) - 1
			for i, p := range path {
				if i == last {
					var lww *crdt.LWW[any]
					if cur[p] == nil {
						lww = &crdt.LWW[any]{}
						cur[p] = lww
					} else {
						lww = cur[p].(*crdt.LWW[any])
					}

					lww.Set(string(mctx.origin), mctx.ts, v)
					return true
					// if value is nil = create lww and set
					// otherwise just set
					// return
				}

				// need to go deeper
				next := cur[p]
				// Need to nest more but no map
				if next == nil && i != last {
					next = make(map[string]any)
					cur[p] = next
				}
			}
			fmt.Println(path, mctx, v)
			return true
		}

		chunks := v.(map[string]any)["#rga"].([]map[string]any)
		var cum int
		for _, ch := range chunks {
			ref := ch["#ref"]
			ins := ch["#ins"]
			del := ch["#del"]

			if ref == nil {
				panic("missing ref")
			}

			if ins == nil && del == nil {
				panic("must be ins or del")
			}

			if ins != nil && del != nil {
				panic("must be one of ins or del")
			}

			if elems, ok := ins.([]string); ok {
				for i, el := range elems {
					fmt.Println(path, mctx.ts, mctx.origin, cum+i, ref, el)
				}
				cum = len(elems)
			}
		}
		return true
	}

	MergePatch(in).Walk(123, "hash-1", mergeFunc)

	type KV struct {
		Path []string
		V    any
	}

	less := func(aa, bb KV) bool {
		a := aa.Path
		b := bb.Path

		n := len(a)
		m := len(b)
		for i := 0; i < n && i < m; i++ {
			if a[i] < b[i] {
				return true
			} else if a[i] > b[i] {
				return false
			}
		}
		return n < m
	}

	tree := btree.NewBTreeGOptions(less, btree.Options{NoLocks: true, Degree: 8})

	tree.Set(KV{Path: []string{"hey", "ho"}, V: "one"})
	tree.Set(KV{Path: []string{"hey", "ho"}, V: "two"})
	tree.Set(KV{Path: []string{"hey", "ho"}, V: "one"})

	var hint btree.PathHint
	tree.SetHint(KV{Path: []string{"foo"}, V: "one"}, &hint)
	tree.SetHint(KV{Path: []string{"f"}, V: "one"}, &hint)
	tree.SetHint(KV{Path: []string{"zoo"}, V: "one"}, &hint)
	tree.SetHint(KV{Path: []string{"z"}, V: "one"}, &hint)
	tree.SetHint(KV{Path: []string{"zebra"}, V: "one"}, &hint)

	fmt.Println(tree.Height())
}

type Object struct {
	applied map[Hash]*Change
	parents map[Hash]struct{}

	// heads = applied - parents

	state map[string]any

	maxClock int64
}

func NewObject() *Object {
	return &Object{
		applied: make(map[Hash]*Change),
		parents: make(map[Hash]struct{}),
		state:   make(map[string]any),
	}
}

func (o *Object) ApplyChange(ch *Change) error {
	if o.applied[ch.Hash] != nil {
		return fmt.Errorf("change is already applied")
	}

	if ch.Ts < o.maxClock {
		return fmt.Errorf("change out of causal order")
	}

	for _, dep := range ch.Deps {
		if _, ok := o.applied[dep]; !ok {
			// Track time here maybe?
			return fmt.Errorf("missing dep")
		}
	}

	type mapState struct {
		result map[string]any
		patch  MergePatch
		depth  int
	}

	stack := []mapState{{
		result: o.state,
		patch:  ch.Data,
		depth:  0,
	}}

	for len(stack) > 0 {
		lastIdx := len(stack) - 1
		cur := stack[lastIdx]
		stack = stack[:lastIdx]

		for k, v := range cur.patch {
			mt := checkMergeType(v)
			switch mt {
			case mergeTypeRecursive:
				// We need to make sure that we have the map value in the current result depth.
				if v := cur.result[k]; v == nil {

				}

				if cur.result[k] == nil {

				}
			}

			// if nested, ok := v.(map[string]any); ok {
			// 	// Check if it's one of our special maps

			// 	if cur.result[k] == nil {
			// 		cur.result[k] = make(map[string]any)
			// 	} else {
			// 		if _, ok := cur.result[k].(map[string]any); !ok {
			// 			return fmt.Errorf("can't patch")
			// 		}
			// 	}
			// }
			// _ = nested
		}
	}

	// Track time.
	o.applied[ch.Hash] = ch
	if ch.Ts > o.maxClock {
		o.maxClock = ch.Ts
	}

	return nil
}

/*
Examples of tagged maps:

- Simple list with interleaving:
	- {"#list": [<items>...]}
- RGA/CausalTree style of list (one of #ins or #del):
	- {"#rga": [{"#ref": "<left-origin-id>",
			     "#ins": [<items-to-insert>...],
			     "#del": <number-of-elements-to-delete>}], <more-segments>...}
- Map value that should be replaced entirely (as opposed to recursively):
	- {"#map": {<map-value>}}
*/

type mergeType int

const (
	mergeTypeLWW       mergeType = 0
	mergeTypeList      mergeType = 1
	mergeTypeRGA       mergeType = 2
	mergeTypeRecursive mergeType = 3
)

var tags = map[string]mergeType{
	"#list": mergeTypeList,
	"#rga":  mergeTypeRGA,
	"#map":  mergeTypeLWW,
}

func checkMergeType(v any) mergeType {
	m, isMap := v.(map[string]any)
	if !isMap {
		return mergeTypeLWW
	}

	// All tagged merge types have 1 key - the tag.
	// Otherwise it's a map we should walk the map recursively.
	// This early return is an optimization to avoid checking merge types
	// if it's clearly not a proper tagged value.
	if len(m) != 1 {
		return mergeTypeRecursive
	}

	switch {
	case m["#list"] != nil:
		return mergeTypeList
	case m["#rga"] != nil:
		return mergeTypeRGA
	case m["#map"]:
		// Atomic map merge with last-writer-wins too.
		return mergeTypeLWW
	default:
		// If it's not a tagged value then it's a normal map
		// which we want to merge recursively.
		return mergeTypeRecursive
	}
}

const keySep = '.'

func (o *Object) MustApplyChange(ch *Change) {
	if err := o.ApplyChange(ch); err != nil {
		panic(err)
	}
}

func TestRadix(t *testing.T) {
	tr := radix.New()

	tr.Insert("hey", "one")
	tr.Insert("hey.ho", "two")

	spew.Dump(tr)
}
