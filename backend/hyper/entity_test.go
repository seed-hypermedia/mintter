package hyper

import (
	"context"
	"mintter/backend/core/coretest"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/logging"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestEntity(t *testing.T) {
	e := NewEntity("hd://a/alice")
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
	kdblob := kd.Blob()
	require.NoError(t, blobs.SaveBlob(ctx, kdblob))

	e := NewEntity("foo")
	ch1, err := e.CreateChange(e.NextTimestamp(), alice.Device, kdblob.CID, map[string]any{
		"name":    "Alice",
		"country": "Wonderland",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, ch1))

	ee, err := blobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)

	alice.Account.MarshalBinary()
	require.Equal(t, map[cid.Cid]struct{}{ch1.CID: {}}, e.heads, "heads must have most recent change")
	require.Equal(t, map[cid.Cid]struct{}{ch1.CID: {}}, ee.heads, "heads must have most recent change")

	ch2, err := ee.CreateChange(ee.NextTimestamp(), alice.Device, kdblob.CID, map[string]any{
		"address": "Limbo 3000",
	})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{ch1.CID}, ch2.Decoded.(Change).Deps, "new change must have previous heads")
	require.NoError(t, blobs.SaveBlob(ctx, ch2))

	ee, err = blobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)

	require.Equal(t, map[cid.Cid]struct{}{ch2.CID: {}}, ee.heads)
	conn, cancel, err := blobs.bs.db.Conn(ctx)
	require.NoError(t, err)
	defer cancel()
	require.NoError(t, hypersql.SetAccountTrust(conn, alice.Account.Principal())) // in this test self trustness is not automatic

	tee, err := blobs.LoadTrustedEntity(ctx, "foo")
	require.NoError(t, err)

	require.Equal(t, tee.heads, ee.heads)

}

func TestEntityMutation_Drafts(t *testing.T) {
	alice := coretest.NewTester("alice")
	ctx := context.Background()

	db := newTestSQLite(t)
	blobs := NewStorage(db, logging.New("mintter/hyper", "debug"))

	kd, err := NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now().Add(-1*time.Hour))
	require.NoError(t, err)
	kdblob := kd.Blob()
	require.NoError(t, blobs.SaveBlob(ctx, kdblob))

	e := NewEntity("foo")
	ch1, err := e.CreateChange(e.NextTimestamp(), alice.Device, kdblob.CID, map[string]any{
		"name":    "Alice",
		"country": "Wonderland",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, ch1))

	ee, err := blobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)

	require.Equal(t, map[cid.Cid]struct{}{ch1.CID: {}}, e.heads, "heads must have most recent change")
	require.Equal(t, map[cid.Cid]struct{}{ch1.CID: {}}, ee.heads, "heads must have most recent change")

	ch2, err := ee.CreateChange(ee.NextTimestamp(), alice.Device, kdblob.CID, map[string]any{
		"address": "Limbo 3000",
	})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{ch1.CID}, ch2.Decoded.(Change).Deps, "new change must have previous heads")
	require.NoError(t, blobs.SaveDraftBlob(ctx, "foo", ch2))

	ee, err = blobs.LoadDraftEntity(ctx, "foo")
	require.NoError(t, err)

	require.Equal(t, map[cid.Cid]struct{}{ch2.CID: {}}, ee.heads)

	// Replacing the
	ch3, err := ee.ReplaceChange(ch2.CID, ee.NextTimestamp(), alice.Device, kdblob.CID, map[string]any{
		"email": "alice@wonderland.com",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.ReplaceDraftBlob(ctx, "foo", ch2.CID, ch3))

	ee, err = blobs.LoadDraftEntity(ctx, "foo")
	require.NoError(t, err)
	require.Equal(t, map[cid.Cid]struct{}{ch3.CID: {}}, ee.heads)
	require.Equal(t, 2, len(ee.applied), "replaced draft must disappear")
}
