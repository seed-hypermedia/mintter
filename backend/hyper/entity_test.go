package hyper

import (
	"context"
	"seed/backend/core"
	"seed/backend/core/coretest"
	"seed/backend/ipfs"
	"seed/backend/logging"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multicodec"
	"github.com/stretchr/testify/require"
)

func TestEntityFromCID(t *testing.T) {
	eid := EntityID("my-test-entity")
	c, err := eid.CID()
	require.NoError(t, err)

	eid2, err := EntityIDFromCID(c)
	require.NoError(t, err)

	require.Equal(t, eid, eid2)
}

func TestEntity(t *testing.T) {
	e := NewEntity("hm://a/alice")
	alice := coretest.NewTester("alice")

	name, _ := e.Get("name")
	require.Nil(t, name)
	bio, _ := e.Get("bio")
	require.Nil(t, bio)

	kd, err := NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now().Add(-1*time.Hour))
	require.NoError(t, err)

	ch, err := e.CreateChange(e.NextTimestamp(), alice.Device, kd.Blob().CID, map[string]any{
		"name": "Alice",
		"bio":  "Test User",
	})
	require.NoError(t, err)

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
	blobs := NewStorage(db, logging.New("seed/hyper", "debug"))

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

	_, err = blobs.LoadEntity(ctx, "foo")
	require.NoError(t, err)
}

func TestTrustedEntities(t *testing.T) {
	type testNode struct {
		blobs      *Storage
		delegation Blob
		me         core.Identity
	}
	prepareNode := func(t *testing.T, name string) testNode {
		t.Helper()
		user := coretest.NewTester(name)
		ctx := context.Background()

		db := newTestSQLite(t)
		blobs := NewStorage(db, logging.New("seed/hyper", "debug"))

		kd, err := NewKeyDelegation(user.Account, user.Device.PublicKey, time.Now().Add(-1*time.Hour))
		require.NoError(t, err)
		delegation := kd.Blob()
		require.NoError(t, blobs.SaveBlob(ctx, delegation))

		// TODO(burdian): trusted your own account should be done elsewhere
		// to be less error-prone.
		require.NoError(t, blobs.SetAccountTrust(ctx, user.Account.Principal()))

		return testNode{
			blobs:      blobs,
			delegation: delegation,
			me:         user.Identity,
		}
	}

	alice := prepareNode(t, "alice")
	bob := prepareNode(t, "bob")
	ctx := context.Background()

	// Introduce bob to alice.
	require.NoError(t, alice.blobs.SaveBlob(ctx, bob.delegation))

	// Alice create entity.
	{
		e := NewEntity("alice-thing")
		ch1, err := e.CreateChange(e.NextTimestamp(), alice.me.DeviceKey(), alice.delegation.CID, map[string]any{
			"name":    "Alice",
			"country": "Wonderland",
		})
		require.NoError(t, err)
		require.NoError(t, alice.blobs.SaveBlob(ctx, ch1))
	}
	// Bob create entity in alice.
	{
		e := NewEntity("bob-thing")
		ch1, err := e.CreateChange(e.NextTimestamp(), bob.me.DeviceKey(), bob.delegation.CID, map[string]any{
			"name":    "Bob",
			"country": "Mordor",
		})
		require.NoError(t, err)
		require.NoError(t, alice.blobs.SaveBlob(ctx, bob.delegation))
		require.NoError(t, alice.blobs.SaveBlob(ctx, ch1))
	}
	// Bob changes Alice's entity.
	var bobsChange cid.Cid
	{
		e, err := alice.blobs.LoadEntity(ctx, "alice-thing")
		require.NoError(t, err)

		ch, err := e.CreateChange(e.NextTimestamp(), bob.me.DeviceKey(), bob.delegation.CID, map[string]any{
			"country": "Mordor",
		})
		require.NoError(t, err)
		require.NoError(t, alice.blobs.SaveBlob(ctx, ch))
		bobsChange = ch.CID
	}

	e, err := alice.blobs.LoadEntity(ctx, "alice-thing")
	require.NoError(t, err)
	v, _ := e.Get("name")
	require.Equal(t, "Alice", v.(string))
	v, _ = e.Get("country")
	require.Equal(t, "Wonderland", v.(string))

	list, err := alice.blobs.ListEntities(ctx, "*")
	require.NoError(t, err)
	want := []EntityID{
		"hm://a/z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj", // alice's account
		"hm://a/z6MkinDD3TSLdyjmPK4Pg11sCePbbjtTQorXQfNzRYjiV2Qe", // bob's account
		"alice-thing",
		"bob-thing",
	}
	require.Equal(t, want, list, "list entities must return all entities")

	list, err = alice.blobs.ListTrustedEntities(ctx, "*")
	require.NoError(t, err)
	want = []EntityID{
		"hm://a/z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj", // alice's account
		"alice-thing",
	}
	require.Equal(t, want, list, "list trusted entities must return our own account")

	require.NoError(t, alice.blobs.SetAccountTrust(ctx, bob.me.Account().Principal()))

	list, err = alice.blobs.ListTrustedEntities(ctx, "*")
	require.NoError(t, err)
	want = []EntityID{
		"hm://a/z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj", // alice's account
		"hm://a/z6MkinDD3TSLdyjmPK4Pg11sCePbbjtTQorXQfNzRYjiV2Qe", // bob's account
		"alice-thing",
		"bob-thing",
	}
	require.Equal(t, want, list, "alice must see bob's stuff after trusting him")

	// Alice still only sees her own changes after trusting bob.
	e, err = alice.blobs.LoadEntity(ctx, "alice-thing")
	require.NoError(t, err)
	v, _ = e.Get("name")
	require.Equal(t, "Alice", v.(string))
	v, _ = e.Get("country")
	require.Equal(t, "Wonderland", v.(string))

	// Alice should be able to load Bob's version.
	e, err = alice.blobs.LoadEntityFromHeads(ctx, "alice-thing", bobsChange)
	require.NoError(t, err)
	v, _ = e.Get("name")
	require.Equal(t, "Alice", v.(string))
	v, _ = e.Get("country")
	require.Equal(t, "Mordor", v.(string))

	// Alice merges Bob's change by creating a new change on top.
	ch, err := e.CreateChange(e.NextTimestamp(), alice.me.DeviceKey(), alice.delegation.CID, map[string]any{
		"friend": "Bob",
	})
	require.NoError(t, err)
	require.NoError(t, alice.blobs.SaveBlob(ctx, ch))

	// Now alice sees bob's changes in her own timeline.
	e, err = alice.blobs.LoadEntity(ctx, "alice-thing")
	require.NoError(t, err)
	v, _ = e.Get("name")
	require.Equal(t, "Alice", v.(string))
	v, _ = e.Get("country")
	require.Equal(t, "Mordor", v.(string))
	v, _ = e.Get("friend")
	require.Equal(t, "Bob", v.(string))
}

func TestEntityMutation_Drafts(t *testing.T) {
	alice := coretest.NewTester("alice")
	ctx := context.Background()

	db := newTestSQLite(t)
	blobs := NewStorage(db, logging.New("seed/hyper", "debug"))

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

func TestEntityDepsReduction(t *testing.T) {
	// Reproducing this scenario:
	//   a ← b ← c ← d
	//    ↖   ↖
	//      f    e
	// Direct deps [a, c,b] should be reduced to [c] because b and a are redundant.

	entity := &Entity{}

	a := ipfs.MustNewCID(multicodec.Raw, multicodec.Identity, []byte("a")) // 0
	b := ipfs.MustNewCID(multicodec.Raw, multicodec.Identity, []byte("b")) // 1
	c := ipfs.MustNewCID(multicodec.Raw, multicodec.Identity, []byte("c")) // 2
	d := ipfs.MustNewCID(multicodec.Raw, multicodec.Identity, []byte("d")) // 3
	e := ipfs.MustNewCID(multicodec.Raw, multicodec.Identity, []byte("e")) // 4
	f := ipfs.MustNewCID(multicodec.Raw, multicodec.Identity, []byte("f")) // 5

	entity.applied = make(map[cid.Cid]int)
	entity.applied[a] = 0
	entity.applied[b] = 1
	entity.applied[c] = 2
	entity.applied[d] = 3
	entity.applied[e] = 4
	entity.applied[f] = 5

	entity.changes = []ParsedBlob[Change]{
		0: {CID: a},
		1: {CID: b},
		2: {CID: c},
		3: {CID: d},
		4: {CID: e},
		5: {CID: f},
	}

	entity.heads = map[cid.Cid]struct{}{
		d: {},
		e: {},
		f: {},
	}

	entity.deps = [][]int{
		0: nil,
		1: {0},
		2: {1},
		3: {2},
		4: {1},
		5: {0},
	}

	entity.rdeps = [][]int{
		0: {1, 5},
		1: {2, 4},
		2: {3},
		3: {},
		4: {},
	}

	require.Equal(t, []cid.Cid{c}, entity.Deps())
}
