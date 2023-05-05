package hyper

import (
	"mintter/backend/core/coretest"
	"testing"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestEntity(t *testing.T) {
	e := NewEntity("mintter:account:alice")
	alice := coretest.NewTester("alice")

	name, _ := e.Get("name")
	require.Nil(t, name)
	bio, _ := e.Get("bio")
	require.Nil(t, bio)

	ch, err := e.Patch(e.NextTimestamp(), alice.Device, cid.Undef, map[string]any{
		"name": "Alice",
		"bio":  "Test User",
	})
	require.NoError(t, err)

	require.Equal(t, TypeChange, ch.Type)
	require.Nil(t, ch.Decoded.(Change).Deps)

	name, _ = e.Get("name")
	require.Equal(t, "Alice", name)
	bio, _ = e.Get("bio")
	require.Equal(t, "Test User", bio)
}
