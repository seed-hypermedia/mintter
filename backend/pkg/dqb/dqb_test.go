package dqb

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestQ(t *testing.T) {
	var testQueries Queries

	var count int
	var (
		qFoo = testQueries.Q(func() string {
			count++
			return "foo"
		})

		qBar = testQueries.Q(func() string {
			count++
			return "bar"
		})
	)

	require.Equal(t, "foo", qFoo())
	require.Equal(t, "foo", qFoo())
	require.Equal(t, "foo", qFoo())
	require.Equal(t, "foo", qFoo())

	require.Equal(t, "bar", qBar())
	require.Equal(t, "bar", qBar())
	require.Equal(t, "bar", qBar())
	require.Equal(t, "bar", qBar())

	require.Equal(t, 2, count, "functions must be memoized")
}
