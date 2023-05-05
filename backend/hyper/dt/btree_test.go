package dt

import (
	"encoding/json"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/btree"
)

func makeMap(s string) map[string]any {
	var v map[string]any
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		panic(err)
	}
	return v
}

func TestMergeBTree(t *testing.T) {
	c1 := makeMap(`{
		"one": "hey",
		"two": "ho",
		"nested": {
			"fooKey": "foo",
			"nested": {
				"bool": true,
				"moves": {"#list": [
					"foo",
					"bar"
				]}
			},
			"barKey": "bar"
		},
		"ok": true
	}`)
	c2 := makeMap(`{
		"two": null,
		"nested": {
			"nested": {
				"moves": {"#list": [
					"hey",
					"ho"
				]}
			}
		},
		"ok": false
	}`)
	want := makeMap(`{
		"one": "hey",
		"ok": false,
		"two": null,
		"nested": {
			"fooKey": "foo",
			"barKey": "bar",
			"nested": {
				"bool": true,
				"moves": [
					"foo",
					"bar",
					"hey",
					"ho"
				]
			}
		}
	}`)

	type kv struct {
		path  []string
		ctx   mergeCtx
		idx   int
		value any
	}

	less := func(aa, bb kv) bool {
		a := aa.path
		b := bb.path

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
			} else if a[i] > b[i] {
				return false
			}
		}

		if aa.ctx.ts < bb.ctx.ts {
			return true
		}

		if aa.ctx.ts > bb.ctx.ts {
			return false
		}

		if aa.ctx.origin < bb.ctx.origin {
			return true
		}

		if aa.ctx.origin > bb.ctx.origin {
			return false
		}

		if aa.idx < bb.idx {
			return true
		}

		if aa.idx > bb.idx {
			return false
		}

		panic("BUG: duplicate elements")
	}

	state := btree.NewBTreeGOptions(less, btree.Options{Degree: 8, NoLocks: true})

	mergeFunc := func(path []string, mctx mergeCtx, value any) bool {
		switch mctx.mt {
		case mergeTypeLWW:
			vv := kv{path: path, ctx: mctx, value: value}
			state.Set(vv)
		case mergeTypeList:
			// validate list value
			list := value.(map[string]any)
			for i, el := range list["#list"].([]any) {
				vv := kv{path: path, ctx: mctx, value: el, idx: i}
				state.Set(vv)
			}
		case mergeTypeRGA:
			panic("TODO RGA")
		default:
			panic("BUG: invalid merge type")
		}

		return true
	}

	stateToMap := func(tree *btree.BTreeG[kv]) map[string]any {
		out := make(map[string]any)
		level := out
		depth := 1

		tree.Scan(func(kv kv) bool {
			if len(kv.path) < depth {
				panic("BUG: btree must be sorted breadth first")
			}

			if len(kv.path) > depth {
				newLevel := make(map[string]any)
				level[kv.path[depth-1]] = newLevel
				level = newLevel
				depth = len(kv.path)

			}

			switch kv.ctx.mt {
			case mergeTypeRGA:
				panic("TODO RGA")
			case mergeTypeLWW:
				level[kv.path[depth-1]] = kv.value
			case mergeTypeList:
				key := kv.path[depth-1]
				var list []any
				if v := level[key]; v != nil {
					list = v.([]any)
				}
				list = append(list, kv.value)
				level[key] = list
			default:
				panic("BUG: invalid merge typ")
			}

			return true
		})

		return out
	}

	MergePatch(c1).Walk(457, "hash-1", mergeFunc)
	MergePatch(c2).Walk(457, "hash-3", mergeFunc)
	require.Equal(t, "", cmp.Diff(want, stateToMap(state)))

	state.Clear()

	MergePatch(c2).Walk(457, "hash-3", mergeFunc)
	MergePatch(c1).Walk(457, "hash-1", mergeFunc)
	require.Equal(t, "", cmp.Diff(want, stateToMap(state)))
}
