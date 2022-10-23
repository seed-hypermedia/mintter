package crdt

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIDSorting(t *testing.T) {
	require.False(t, makeOpID(11, 1).Less(makeOpID(2, 1)))
	require.False(t, makeOpID(11, 1).Less(makeOpID(2, 1)))
	require.True(t, makeOpID(11, 1).Less(makeOpID(2, 2)))
}

func makeOpID(site int, clock int) OpID {
	return OpID{uint64(clock), uint64(site)}
}
