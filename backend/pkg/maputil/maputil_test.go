package maputil

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSet(t *testing.T) {
	m := map[string]any{}

	Set(m, []string{"foo", "bar", "baz"}, "Hello")

	require.Equal(t, map[string]any{
		"foo": map[string]any{
			"bar": map[string]any{
				"baz": "Hello",
			},
		},
	}, m)
}

func TestDelete(t *testing.T) {
	m := map[string]any{}

	Set(m, []string{"foo", "bar", "baz"}, "Hello")
	Set(m, []string{"name"}, "Alice")
	Delete(m, []string{"foo", "bar"})

	require.Equal(t, map[string]any{
		"name": "Alice",
		"foo":  map[string]any{},
	}, m)
}
