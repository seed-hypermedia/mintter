package hyper

import (
	"context"
	"mintter/backend/core/coretest"
	"mintter/backend/logging"
	"testing"
	"time"

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

	ch, err := e.CreateChange(e.NextTimestamp(), alice.Device, cid.Undef, map[string]any{
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

func TestEntityMutation(t *testing.T) {
	alice := coretest.NewTester("alice")
	ctx := context.Background()

	db := newTestSQLite(t)
	blobs := NewStorage(db, logging.New("mintter/hyper", "debug"))

	kd, err := NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now().Add(-1*time.Hour))
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, kd.Blob()))

	panic("TODO: finish basic test for mutating an entity more than once")
}
