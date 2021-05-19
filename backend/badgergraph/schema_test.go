package badgergraph

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRegisterPredicate(t *testing.T) {
	require.Panics(t, func() {
		reg := NewSchema()
		reg.RegisterPredicate("User", Predicate{Name: "name", Type: ValueTypeString})
		reg.RegisterPredicate("User", Predicate{Name: "name", Type: ValueTypeString})
	}, "must panic with duplicate predicates")

	require.Panics(t, func() {
		reg := NewSchema()
		reg.RegisterPredicate("User", Predicate{Name: "name"})
	}, "must panic with missing value type")

	t.Run("must register simple predicate", func(t *testing.T) {
		reg := NewSchema()
		name := reg.RegisterPredicate("User", Predicate{Name: "name", Type: ValueTypeString, HasIndex: true})
		want := Predicate{
			node:     "User",
			fullName: "User.name",
			Name:     "name",
			Type:     ValueTypeString,
			HasIndex: true,
		}
		require.Equal(t, want, name)
		require.Equal(t, want, reg.schema["User"]["name"])
	})
}
