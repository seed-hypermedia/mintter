package vcsdb

import (
	"context"
	"crypto/sha1" //nolint:gosec
	"encoding/hex"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/vcs/vcstypes"
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

	perma, err := NewPermanode(vcstypes.NewAccountPermanode(alice.AccountID))
	require.NoError(t, err)

	now := time.Time{}

	// Create simple draft change.
	{
		require.NoError(t, conn.BeginTx(true))
		obj := conn.NewObject(perma)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		c1 := conn.NewChange(obj, aliceLocal, nil, now)

		lamportTime := conn.GetChangeLamportTime(c1)
		root := RootNode
		seq := 1

		seq = conn.AddDatom(obj, NewDatom(c1, seq, root, "document/title", "This is a title", lamportTime))
		conn.AddDatom(obj, NewDatom(c1, seq, root, "document/subtitle", "This is a subtitle", lamportTime))

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
		seq := conn.NextChangeSeq(obj, change)
		lamport := conn.GetChangeLamportTime(change)

		root := RootNode

		require.True(t, conn.DeleteDatoms(obj, change, root, attrTitle))
		require.True(t, conn.DeleteDatoms(obj, change, root, attrSubtitle))

		seq = conn.AddDatom(obj, NewDatom(change, seq, root, "document/title", "New Title", lamport))
		conn.AddDatom(obj, NewDatom(change, seq, root, "document/subtitle", "New Subtitle", lamport))

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
		checkSum(t, "6ed9460baa77e8680d5ad46499d0bc5fbdce2b7e", data)
	}

	// Create a new change with base.
	now = now.Add(time.Hour)

	{
		require.NoError(t, conn.BeginTx(true))

		obj := conn.LookupPermanode(perma.ID)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		heads := conn.GetVersion(obj, "main", aliceLocal)
		require.Len(t, heads, 1)

		change := conn.NewChange(obj, aliceLocal, heads, now)
		lamport := conn.GetChangeLamportTime(change)
		seq := 1

		conn.AddDatom(obj, NewDatom(change, seq, RootNode, "document/title", "This is a changed title", lamport))

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

	perma, err := NewPermanode(vcstypes.NewAccountPermanode(alice.AccountID))
	require.NoError(t, err)

	now := time.Time{}

	var (
		c1  LocalID
		c2  LocalID
		c21 LocalID
		c22 LocalID
	)

	err = conn.WithTx(true, func() error {
		obj := conn.NewObject(perma)
		aliceLocal := conn.EnsureIdentity(alice.Identity)

		c1 = conn.NewChange(obj, aliceLocal, nil, now)
		conn.AddDatom(obj, NewDatom(c1, 1, RootNode, "title", "Title 1", conn.GetChangeLamportTime(c1)))

		c2 = conn.NewChange(obj, aliceLocal, LocalVersion{c1}, now.Add(time.Hour))
		conn.AddDatom(obj, NewDatom(c2, 1, RootNode, "title", "Title 2", conn.GetChangeLamportTime(c2)))

		c21 = conn.NewChange(obj, aliceLocal, LocalVersion{c2}, now.Add(time.Hour*2))
		conn.AddDatom(obj, NewDatom(c21, 1, RootNode, "title", "Concurrent Title 1", conn.GetChangeLamportTime(c21)))

		c22 = conn.NewChange(obj, aliceLocal, LocalVersion{c2}, now.Add(time.Hour*2))
		conn.AddDatom(obj, NewDatom(c22, 1, RootNode, "title", "Concurrent Title 2", conn.GetChangeLamportTime(c22)))

		conn.SaveVersion(obj, "branch-1", aliceLocal, LocalVersion{c21})
		conn.SaveVersion(obj, "branch-2", aliceLocal, LocalVersion{c22})
		conn.SaveVersion(obj, "merged", aliceLocal, LocalVersion{c21, c22})

		return nil
	})
	require.NoError(t, err)

	versions := []string{"branch-1", "branch-2", "merged"}
	want := [][]Datom{
		{
			NewDatom(c1, 1, RootNode, "title", "Title 1", 1),
			NewDatom(c2, 1, RootNode, "title", "Title 2", 2),
			NewDatom(c21, 1, RootNode, "title", "Concurrent Title 1", 3),
		},
		{
			NewDatom(c1, 1, RootNode, "title", "Title 1", 1),
			NewDatom(c2, 1, RootNode, "title", "Title 2", 2),
			NewDatom(c22, 1, RootNode, "title", "Concurrent Title 2", 3),
		},
		{
			NewDatom(c1, 1, RootNode, "title", "Title 1", 1),
			NewDatom(c2, 1, RootNode, "title", "Title 2", 2),
			NewDatom(c21, 1, RootNode, "title", "Concurrent Title 1", 3),
			NewDatom(c22, 1, RootNode, "title", "Concurrent Title 2", 3),
		},
	}
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

				conn.IterateObjectDatoms(obj, ver, func(dr DatomRow) error {
					got[i] = append(got[i], dr.Datom())
					return nil
				})

				return nil
			})
		})
	}
	require.NoError(t, g.Wait())

	for i, ver := range versions {
		require.Equal(t, want[i], got[i], "failed version %s", ver)
	}
}

func TestNodeID2String(t *testing.T) {
	require.Equal(t, "b1", NodeIDFromString("b1").String())
	require.Equal(t, "$ROOT", RootNode.String())
	require.Equal(t, "$TRASH", TrashNode.String())

	nid := NodeID{234, 255, 135, 120, 50, 60, 70, 0}
	require.Equal(t, "6v+HeDI8Rg", nid.String())

	require.Equal(t, TrashNode, NodeIDFromString("$TRASH"))
	require.Equal(t, RootNode, NodeIDFromString("$ROOT"))
}
