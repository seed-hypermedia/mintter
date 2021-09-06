package crdt

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIDSorting(t *testing.T) {
	require.True(t, ID{"alice", 1}.Less(ID{"bob", 1}))
	require.False(t, ID{"zalice", 1}.Less(ID{"bob", 1}))
	require.True(t, ID{"zalice", 1}.Less(ID{"bob", 2}))
}

func TestFrontier(t *testing.T) {
	f := NewVectorClock()

	id := f.NewID("alice")
	require.NoError(t, f.Track(id))
	id = f.NewID("alice")
	require.NoError(t, f.Track(id))
	id.Clock = 1
	require.Error(t, f.Track(id))
	id = f.NewID("bob")
	require.NoError(t, f.Track(id))

	require.Equal(t, 3, f.maxClock)
	require.Equal(t, 2, f.lastSeen["alice"])
	require.Equal(t, 3, f.lastSeen["bob"])
}
