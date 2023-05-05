package crdt2

import (
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

func TestMapNested(t *testing.T) {
	m := NewMap()

	ok := m.ApplyPatch(3, "alice", map[string]any{
		"name": "Alice",
		"friends": map[string]any{
			"#list": []any{
				"bob", "carol",
			},
		},
	})
	require.True(t, ok)

	ok = m.ApplyPatch(1, "alice", map[string]any{
		"friends": map[string]any{
			"#list": []any{
				"david",
			},
		},
	})
	require.True(t, ok)

	f, ok := m.Get("friends")
	require.Nil(t, f)
	require.False(t, ok)

	want := []any{"david", "bob", "carol"}
	friends, ok := m.List("friends")
	require.True(t, ok)
	require.Equal(t, want, friends)
}
