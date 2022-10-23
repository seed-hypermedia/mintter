package sqlitevcs

import (
	"context"
	"crypto/sha1" //nolint:gosec
	"encoding/hex"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"testing"
	"time"

	blocks "github.com/ipfs/go-block-format"
	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"
)

func TestSmoke(t *testing.T) {
	db := New(sqliteschema.MakeTestDB(t))
	ctx := context.Background()
	alice := coretest.NewTester("alice")

	conn, release, err := db.Conn(ctx)
	require.NoError(t, err)
	defer release()

	perma, err := vcs.EncodePermanode(vcs.NewPermanode("test", alice.AccountID, hlc.Time{}))
	require.NoError(t, err)

	clock := hlc.NewClockWithWall(func() time.Time {
		return time.Time{}
	})

	// Create simple draft change.
	{
		require.NoError(t, conn.BeginTx(true))
		obj := conn.NewObject(perma)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		c1 := conn.NewChange(obj, aliceLocal, nil, clock)

		b := vcs.NewBatch(clock, 123)

		conn.AddDatoms(obj, c1,
			b.New(vcs.RootNode, "document/title", "This is a title"),
			b.New(vcs.RootNode, "document/subtitle", "This is a subtitle"),
		)

		conn.SaveVersion(obj, "draft", aliceLocal, []LocalID{c1})

		require.NoError(t, conn.Commit())
	}

	// Amend existing change.
	{
		require.NoError(t, conn.BeginTx(true))
		obj := conn.LookupPermanode(perma.ID)
		aliceLocal := conn.EnsureIdentity(alice.Identity)
		attrTitle := conn.Attr("document/title")
		attrSubtitle := conn.Attr("document/subtitle")

		heads := conn.GetVersion(obj, "draft", aliceLocal)
		if len(heads) != 1 {
			panic("BUG: not correct version")
		}

		change := heads[0]

		root := vcs.RootNode

		require.True(t, conn.DeleteDatoms(obj, change, root, attrTitle))
		require.True(t, conn.DeleteDatoms(obj, change, root, attrSubtitle))

		b := vcs.NewBatch(clock, 123)

		conn.AddDatoms(obj, change,
			b.New(root, "document/title", "New Title"),
			b.New(root, "document/subtitle", "New Subtitle"),
		)

		require.NoError(t, conn.Commit())
	}

	// Encode change.
	var blk blocks.Block
	{
		require.NoError(t, conn.BeginTx(true))
		obj := conn.LookupPermanode(perma.ID)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		heads := conn.GetVersion(obj, "draft", aliceLocal)

		conn.DeleteVersion(obj, "draft", aliceLocal)

		blk = conn.EncodeChange(heads[0], alice.Device)
		data := blk.RawData()
		require.NoError(t, conn.Err())
		require.NotNil(t, data)

		conn.SaveVersion(obj, "main", aliceLocal, heads)

		require.NoError(t, conn.Commit())

		// Canonical encoding must be deterministic.
		// Hash is generated out of band.
		checkSum(t, "01ecfa07518fbd53a11ade86fccc937b46d6dbf5", data)
	}

	// Create a new change with base.
	{
		require.NoError(t, conn.BeginTx(true))

		obj := conn.LookupPermanode(perma.ID)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		heads := conn.GetVersion(obj, "main", aliceLocal)
		require.Len(t, heads, 1)

		change := conn.NewChange(obj, aliceLocal, heads, clock)

		conn.AddDatom(obj, change, vcs.NewDatom(vcs.RootNode, "document/title", "This is a changed title", clock.Now().Pack(), 123))

		conn.EncodeChange(change, alice.Device)

		conn.SaveVersion(obj, "main", aliceLocal, []LocalID{change})

		require.NoError(t, conn.Commit())
	}
}

func checkSum(t *testing.T, want string, data []byte) {
	sum := sha1.Sum(data) //nolint:gosec
	require.Equal(t, want, hex.EncodeToString(sum[:]))
}

func TestIterateObjectDatoms(t *testing.T) {
	db := New(sqliteschema.MakeTestDB(t))

	ctx := context.Background()
	alice := coretest.NewTester("alice")

	conn, release, err := db.Conn(ctx)
	require.NoError(t, err)
	defer release()

	perma, err := vcs.EncodePermanode(vcs.NewPermanode("test", alice.AccountID, hlc.Time{}))
	require.NoError(t, err)

	var (
		c1  LocalID
		c2  LocalID
		c21 LocalID
		c22 LocalID
	)

	clock := hlc.NewClockWithWall(func() time.Time { return time.Time{} })

	var want [][]Datom
	err = conn.WithTx(true, func() error {
		obj := conn.NewObject(perma)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		c1 = conn.NewChange(obj, aliceLocal, nil, clock)
		title1 := vcs.NewDatom(vcs.RootNode, "title", "Title 1", clock.Now().Pack(), 123)
		conn.AddDatom(obj, c1, title1)

		c2 = conn.NewChange(obj, aliceLocal, LocalVersion{c1}, clock)
		title2 := vcs.NewDatom(vcs.RootNode, "title", "Title 2", clock.Now().Pack(), 123)
		conn.AddDatom(obj, c2, title2)

		c21 = conn.NewChange(obj, aliceLocal, LocalVersion{c2}, clock)
		title21 := vcs.NewDatom(vcs.RootNode, "title", "Concurrent Title 1", clock.Now().Pack(), 123)
		conn.AddDatom(obj, c21, title21)

		c22 = conn.NewChange(obj, aliceLocal, LocalVersion{c2}, clock)
		title22 := vcs.NewDatom(vcs.RootNode, "title", "Concurrent Title 2", clock.Now().Pack(), 123)
		conn.AddDatom(obj, c22, title22)

		conn.SaveVersion(obj, "branch-1", aliceLocal, LocalVersion{c21})
		conn.SaveVersion(obj, "branch-2", aliceLocal, LocalVersion{c22})
		conn.SaveVersion(obj, "merged", aliceLocal, LocalVersion{c21, c22})

		want = [][]Datom{
			{title1, title2, title21},
			{title1, title2, title22},
			{title1, title2, title21, title22},
		}

		return nil
	})
	require.NoError(t, err)

	versions := []string{"branch-1", "branch-2", "merged"}

	got := make([][]Datom, len(want))

	var g errgroup.Group
	for i := range want {
		i := i
		g.Go(func() error {
			conn, release, err := db.Conn(ctx)
			if err != nil {
				return err
			}
			defer release()

			return conn.WithTx(true, func() error {
				obj := conn.LookupPermanode(perma.ID)
				aliceLocal := conn.EnsureIdentity(alice.Identity)
				ver := conn.GetVersion(obj, versions[i], aliceLocal)
				cs := conn.ResolveChangeSet(obj, ver)

				it := conn.QueryObjectDatoms(obj, cs)
				got[i] = it.Slice()
				require.NoError(t, it.Err())

				return nil
			})
		})
	}
	require.NoError(t, g.Wait())

	for i, ver := range versions {
		require.Equal(t, want[i], got[i], "failed version %s", ver)
	}
}

func TestChangeEncoding(t *testing.T) {
	db := New(sqliteschema.MakeTestDB(t))

	ctx := context.Background()
	alice := coretest.NewTester("alice")

	conn, release, err := db.Conn(ctx)
	require.NoError(t, err)
	defer release()

	perma, err := vcs.EncodePermanode(vcs.NewPermanode("test", alice.AccountID, hlc.Time{}))
	require.NoError(t, err)

	require.NoError(t, conn.BeginTx(true))

	clock := hlc.NewClock()

	obj := conn.NewObject(perma)
	me := conn.EnsureIdentity(alice.Identity)
	c1 := conn.NewChange(obj, me, nil, clock)

	person1 := vcs.NewNodeIDv1(time.Unix(1, 0))
	person2 := vcs.NewNodeIDv1(time.Unix(2, 0))

	batch := vcs.NewBatch(clock, alice.Device.Abbrev())

	batch.Add(vcs.RootNode, "person", person1)
	batch.Add(person1, "name", "Alice")
	batch.Add(person1, "email", "alice@example.com")

	batch.Add(vcs.RootNode, "person", person2)
	batch.Add(person2, "name", "Bob")
	batch.Add(person2, "email", "bob@example.com")

	datoms := batch.Dirty()

	conn.AddDatoms(obj, c1, datoms...)

	conn.SaveVersion(obj, "main", me, LocalVersion{c1})

	blk := conn.EncodeChange(c1, alice.Device)

	require.NoError(t, conn.Commit())

	vc := must.Do2(VerifyChangeBlock(blk))
	c2 := conn.StoreRemoteChange(obj, vc, nil)
	require.Equal(t, c1, c2)

	got := must.Do2(datomsFromChange(c1, vc.Decoded))
	require.Equal(t, datoms, got)
}
