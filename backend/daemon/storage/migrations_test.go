package storage

import (
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

func TestMigrationsSorted(t *testing.T) {
	require.True(t, slices.IsSortedFunc(migrations, func(a, b migration) bool {
		return a.Version < b.Version
	}), "the list of migrations must be sorted")
}
