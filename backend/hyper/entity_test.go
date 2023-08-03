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

func TestTrustedEntity(t *testing.T) {
	//t.Skip("Under construction")
	alice := coretest.NewTester("alice")
	bob := coretest.NewTester("bob")
	carol := coretest.NewTester("carol")
	ctx := context.Background()

	dbAlice := newTestSQLite(t)
	aliceBlobs := NewStorage(dbAlice, logging.New("mintter/hyperAlice", "debug"))

	dbBob := newTestSQLite(t)
	bobBlobs := NewStorage(dbBob, logging.New("mintter/hyperBob", "debug"))

	dbCarol := newTestSQLite(t)
	carolBlobs := NewStorage(dbCarol, logging.New("mintter/hyperCarol", "debug"))

	kdAlice, err := NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now().Add(-1*time.Hour))
	require.NoError(t, err)
	kdAliceBlob := kdAlice.Blob()
	require.NoError(t, aliceBlobs.SaveBlob(ctx, kdAliceBlob))

	kdBob, err := NewKeyDelegation(bob.Account, bob.Device.PublicKey, time.Now().Add(-1*time.Hour))
	require.NoError(t, err)
	kdBobBlob := kdBob.Blob()
	require.NoError(t, bobBlobs.SaveBlob(ctx, kdBobBlob))

	kdCarol, err := NewKeyDelegation(carol.Account, carol.Device.PublicKey, time.Now().Add(-1*time.Hour))
	require.NoError(t, err)
	kdCarolBlob := kdCarol.Blob()
	require.NoError(t, carolBlobs.SaveBlob(ctx, kdCarolBlob))

	//Account synchronization and trustness.
	require.NoError(t, carolBlobs.SaveBlob(ctx, kdBobBlob))
	require.NoError(t, carolBlobs.SaveBlob(ctx, kdAliceBlob))
	require.NoError(t, bobBlobs.SaveBlob(ctx, kdAliceBlob))
	require.NoError(t, bobBlobs.SaveBlob(ctx, kdCarolBlob))
	require.NoError(t, aliceBlobs.SaveBlob(ctx, kdBobBlob))
	require.NoError(t, aliceBlobs.SaveBlob(ctx, kdCarolBlob))

	//Everyone trusts themselves.
	require.NoError(t, aliceBlobs.SetAccountTrust(ctx, alice.Account.Principal()))
	require.NoError(t, bobBlobs.SetAccountTrust(ctx, bob.Account.Principal()))
	require.NoError(t, carolBlobs.SetAccountTrust(ctx, carol.Account.Principal()))

	e := NewEntity("foo")
	chA, err := e.CreateChange(e.NextTimestamp(), alice.Device, kdAliceBlob.CID, map[string]any{
		"Alice's Change": "A is trusted from Alice's perspective",
	})
	require.NoError(t, err)
	require.NoError(t, aliceBlobs.SaveBlob(ctx, chA))

	alicesEntity, err := aliceBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)

	require.Equal(t, map[cid.Cid]struct{}{chA.CID: {}}, e.heads, "heads must have most recent change")
	require.Equal(t, map[cid.Cid]struct{}{chA.CID: {}}, alicesEntity.heads, "heads must have most recent change")

	// Alice syncs with Bob and Bob makes a change.
	require.NoError(t, bobBlobs.SaveBlob(ctx, chA))
	alicesEntitySyncedWithBob, err := bobBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)
	require.Equal(t, alicesEntity.heads, alicesEntitySyncedWithBob.heads)

	chB, err := alicesEntitySyncedWithBob.CreateChange(alicesEntitySyncedWithBob.NextTimestamp(), bob.Device, kdBobBlob.CID, map[string]any{
		"Bob's change": "B is untrusted from Alice's perspective",
	})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{chA.CID}, chB.Decoded.(Change).Deps, "new change must have previous heads")
	require.NoError(t, bobBlobs.SaveBlob(ctx, chB))

	// Alice syncs with Carol the first version (not the one changed by Bob) and Carol makes a change.
	require.NoError(t, carolBlobs.SaveBlob(ctx, chA))
	alicesEntitySyncedWithCarol, err := carolBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)
	require.Equal(t, alicesEntity.heads, alicesEntitySyncedWithCarol.heads)

	chC, err := alicesEntitySyncedWithCarol.CreateChange(alicesEntitySyncedWithCarol.NextTimestamp(), bob.Device, kdCarolBlob.CID, map[string]any{
		"Carol's change": "C is untrusted from Alice's perspective",
	})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{chA.CID}, chC.Decoded.(Change).Deps, "new change must have previous heads")
	require.NoError(t, carolBlobs.SaveBlob(ctx, chC))

	// Bob makes a change from his previous change.
	chD, err := alicesEntitySyncedWithBob.CreateChange(alicesEntitySyncedWithBob.NextTimestamp(), bob.Device, kdBobBlob.CID, map[string]any{
		"Another Bob's change": "D is untrusted from Alice's perspective",
	})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{chB.CID}, chD.Decoded.(Change).Deps, "new change must have previous heads")
	require.NoError(t, bobBlobs.SaveBlob(ctx, chD))
	bobLatestChanges, err := bobBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)

	// Alice syncs latest bob changes.
	require.NoError(t, aliceBlobs.SaveBlob(ctx, chB))
	require.NoError(t, aliceBlobs.SaveBlob(ctx, chD))
	alicesEntitySyncedWithBobChanges, err := aliceBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)
	require.Equal(t, bobLatestChanges.heads, alicesEntitySyncedWithBobChanges.heads)

	// Alice now changes the document on top of Bob's changes.
	chE, err := alicesEntitySyncedWithBobChanges.CreateChange(alicesEntitySyncedWithBobChanges.NextTimestamp(), alice.Device, kdAliceBlob.CID, map[string]any{
		"Another Alice's change": "E is trusted from Alice's perspective",
	})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{chD.CID}, chE.Decoded.(Change).Deps, "new change must have previous heads")
	require.NoError(t, aliceBlobs.SaveBlob(ctx, chE))

	// Carol syncs latest Alice content.
	require.NoError(t, carolBlobs.SaveBlob(ctx, chB))
	require.NoError(t, carolBlobs.SaveBlob(ctx, chD))
	require.NoError(t, carolBlobs.SaveBlob(ctx, chE))
	carolView, err := carolBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)
	require.Len(t, carolView.heads, 2)

	require.Equal(t, map[cid.Cid]struct{}{chE.CID: {}, chC.CID: {}}, carolView.heads, "heads must contain both Carol latest changes and Alice's")

	// Carol now uses changes from both Alice an the old version of the document Carol had.
	chF, err := carolView.CreateChange(carolView.NextTimestamp(), carol.Device, kdCarolBlob.CID, map[string]any{
		"Last Carol change": "F is untrusted from Alice's perspective",
	})
	require.NoError(t, err)
	require.Contains(t, chF.Decoded.(Change).Deps, chE.CID, "Changes must depend on both heads")
	require.Contains(t, chF.Decoded.(Change).Deps, chC.CID, "Changes must depend on both heads")
	require.NoError(t, carolBlobs.SaveBlob(ctx, chF))
	carolLatestChanges, err := carolBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)

	// Alice now receives Carol changes
	require.NoError(t, aliceBlobs.SaveBlob(ctx, chF))
	_, err = aliceBlobs.LoadEntity(ctx, "foo")
	require.Error(t, err, "missing dependency for change C")
	require.NoError(t, aliceBlobs.SaveBlob(ctx, chC))
	aliceView, err := aliceBlobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)
	require.Equal(t, carolLatestChanges.heads, aliceView.heads)

	trustedEntity, err := aliceBlobs.LoadTrustedEntity(ctx, "foo")
	require.NoError(t, err)

	require.Len(t, trustedEntity.heads, 1)
	require.Equal(t, map[cid.Cid]struct{}{chE.CID: {}}, trustedEntity.heads, "Last trusted change was E made by Alice herself")

	// Now trust Carol and see if we get F changes
	require.NoError(t, aliceBlobs.SetAccountTrust(ctx, carol.Account.Principal()))
	trustedEntity, err = aliceBlobs.LoadTrustedEntity(ctx, "foo")
	require.NoError(t, err)
	require.Len(t, trustedEntity.heads, 1)
	require.Equal(t, map[cid.Cid]struct{}{chF.CID: {}}, trustedEntity.heads, "Last trusted change is now Carol's since Carol is trusted now")

	// Now untrust Carol again and see if we get back E changes
	require.NoError(t, aliceBlobs.UnsetAccountTrust(ctx, carol.Account.Principal()))
	trustedEntity, err = aliceBlobs.LoadTrustedEntity(ctx, "foo")
	require.NoError(t, err)
	require.Len(t, trustedEntity.heads, 1)
	require.Equal(t, map[cid.Cid]struct{}{chE.CID: {}}, trustedEntity.heads, "Last trusted change was E made by Alice herself")
}
