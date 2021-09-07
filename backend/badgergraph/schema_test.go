package badgergraph

import (
	"testing"

	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
)

func TestRegisterPredicate(t *testing.T) {
	require.Panics(t, func() {
		reg := NewSchema()
		reg.Register("User", Predicate{Name: "name", Type: ValueTypeString})
		reg.Register("User", Predicate{Name: "name", Type: ValueTypeString})
	}, "must panic with duplicate predicates")

	require.Panics(t, func() {
		reg := NewSchema()
		reg.Register("User", Predicate{Name: "name"})
	}, "must panic with missing value type")

	t.Run("must register simple predicate", func(t *testing.T) {
		reg := NewSchema()
		reg.Register("User",
			Predicate{Name: "user/name", Type: ValueTypeString, HasIndex: true},
			Predicate{Name: "user/lastName", Type: ValueTypeString},
		)

		litter.Dump(reg.schema["User"])
	})
}
