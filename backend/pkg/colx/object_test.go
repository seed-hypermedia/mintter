package colx

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestObjectSet(t *testing.T) {
	m := map[string]any{}

	ObjectSet(m, []string{"foo", "bar", "baz"}, "Hello")

	require.Equal(t, map[string]any{
		"foo": map[string]any{
			"bar": map[string]any{
				"baz": "Hello",
			},
		},
	}, m)
}

func TestObjectDelete(t *testing.T) {
	m := map[string]any{}

	ObjectSet(m, []string{"foo", "bar", "baz"}, "Hello")
	ObjectSet(m, []string{"name"}, "Alice")
	ObjectDelete(m, []string{"foo", "bar"})

	require.Equal(t, map[string]any{
		"name": "Alice",
		"foo":  map[string]any{},
	}, m)
}

func TestObjectDeleteMissing(t *testing.T) {
	m := map[string]any{}
	ObjectDelete(m, []string{"foo", "bar"})
	require.Len(t, m, 0, "delete must not created nested maps")
}
