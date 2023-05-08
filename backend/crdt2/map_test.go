package crdt2

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMap(t *testing.T) {
	m := NewMap()

	m.Set(2, "alice", []string{"foo", "bar"}, "Hello")
	m.Set(1, "bob", []string{"foo", "bar"}, true)
	m.Set(1, "bob", []string{"foo", "bar", "baz"}, "baz")

	v, ok := m.Get("foo", "bar")
	require.Equal(t, "Hello", v.(string))
	require.True(t, ok)

	v, ok = m.Get("hey", "ho")
	require.False(t, ok)
	require.Nil(t, v)
}

func TestMapListValues(t *testing.T) {
	m := NewMap()

	ok := m.ApplyPatch(3, "alice", map[string]any{
		"name": "Alice",
		"friends": map[string]any{
			"#list": map[string]any{
				"#ins": []any{
					"bob", "carol",
				},
			},
		},
	})
	require.True(t, ok)
	friends, ok := m.List("friends")
	require.True(t, ok)
	require.Equal(t, []any{"bob", "carol"}, friends)

	ok = m.ApplyPatch(1, "alice", map[string]any{
		"friends": map[string]any{
			"#list": map[string]any{
				"#ins": []any{
					"david",
				},
			},
		},
	})
	require.True(t, ok)

	want := []any{"david", "bob", "carol"}
	friends, ok = m.List("friends")
	require.Equal(t, want, friends)
	require.True(t, ok)

	m.ForEachListChunk([]string{"friends"}, func(time int64, origin string, items []any) bool {
		fmt.Println(time, origin, items)

		return true
	})
}
