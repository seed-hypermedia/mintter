package storage

import (
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

func TestMigrationList(t *testing.T) {
	require.True(t, slices.IsSortedFunc(migrations, func(a, b migration) bool {
		return a.Version < b.Version
	}), "the list of migrations must be sorted")

	out := slices.CompactFunc(migrations, func(a, b migration) bool {
		return a.Version == b.Version
	})
	if len(out) != len(migrations) {
		t.Fatalf("the list of migrations must not contain duplicates: %v", migrations)
	}
}
