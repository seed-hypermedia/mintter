package slices

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSplice(t *testing.T) {
	s := Splice([]string{}, 0, "hello")
	require.Equal(t, []string{"hello"}, s)
	s = Splice(s, 1, "world")
	require.Equal(t, []string{"hello", "world"}, s)
	s = Splice(s, 0, "hey")
	require.Equal(t, []string{"hey", "hello", "world"}, s)
}
