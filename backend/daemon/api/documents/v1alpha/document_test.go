package documents

import (
	"context"
	"fmt"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

func TestDocumentMutation(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	entity := hyper.NewEntity(hyper.NewEntityID("mintter:document", "doc-1"))
	dm, err := newDocumentMutation(entity, alice.Device, delegation, cid.Undef)
	require.NoError(t, err)
	require.NoError(t, dm.SetCreateTime(time.Now()))
	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))

	// Moving some blocks around.
	require.NoError(t, dm.MoveBlock("b1", "", ""))
	require.NoError(t, dm.MoveBlock("b2", "", ""))
	require.NoError(t, dm.MoveBlock("b2", "", ""))
	require.NoError(t, dm.MoveBlock("b1", "", "b2"))
	require.NoError(t, dm.MoveBlock("b3", "b1", ""))
	require.NoError(t, dm.MoveBlock("b2", "b1", "b3"))
	require.Len(t, dm.moveLog, 4)

	blob, err := dm.Commit(ctx, blobs)
	require.NoError(t, err)
	_ = blob

	litter.Dump(dm.patch)
}

func TestCompressMoves(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	entity := hyper.NewEntity(hyper.NewEntityID("mintter:document", "doc-1"))
	dm, err := newDocumentMutation(entity, alice.Device, delegation, cid.Undef)
	require.NoError(t, err)
	require.NoError(t, dm.SetCreateTime(time.Now()))
	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))

	// Setting some existing moves.
	require.NoError(t, dm.tree.SetNodePosition("alice", "a", "", ""))
	require.NoError(t, dm.tree.SetNodePosition("alice", "x", "a", ""))
	require.NoError(t, dm.tree.SetNodePosition("alice", "b", "", "a"))
	require.NoError(t, dm.tree.SetNodePosition("alice", "c", "", "b"))
	require.NoError(t, dm.tree.SetNodePosition("alice", "z", "b", ""))

	require.NoError(t, dm.MoveBlock("foo", "b", "z"))
	require.NoError(t, dm.MoveBlock("b", "a", "x"))

	// Test anchoring to existing positions.
	require.Equal(t, []any{
		map[string]any{
			"@": "alice",
			"b": "foo",
			"l": "z",
			"p": "b",
		},
		map[string]any{
			"@": "alice",
			"b": "b",
			"l": "x",
			"p": "a",
		},
	}, dm.compressMoves())

	// Test reducing redundant moves.
	require.NoError(t, dm.MoveBlock("b", "", "a"))
	require.Equal(t, []any{
		map[string]any{
			"@": "alice",
			"b": "foo",
			"l": "z",
			"p": "b",
		},
	}, dm.compressMoves())

	// Test anchoring to our own positions.
	require.NoError(t, dm.MoveBlock("foo", "", "b"))
	require.Equal(t, []any{
		map[string]any{
			"b": "foo",
			"l": "b",
		},
	}, dm.compressMoves())
}

func TestChars(t *testing.T) {
	type item struct {
		block   string
		change  string
		pos     int
		deleted bool
	}

	isAware := func(h1, h2 string) bool {
		if h1 == h2 {
			return true
		}

		if h1 == "carol" && h2 == "alice" {
			return true
		}

		return false
	}

	var list []item

	insert := func(blk string, pos int, at string) int {
		var c int
		var idx int
		for i := range list {
			item := list[i]
			if !isAware(at, item.change) {
				continue
			}
			if c == pos {
				idx = i
				break
			}
			c++
		}

		list = slices.Insert(list, idx, item{block: blk, pos: pos, change: at})
		return idx
	}

	insert("b1", 0, "alice")
	insert("b2", 1, "alice")
	insert("b3", 2, "alice")

	insert("bob1", 0, "bob")
	insert("bob2", 1, "bob")
	insert("bob3", 2, "bob")

	insert("carol1", 1, "carol")
	insert("bob4", 3, "bob")

	fmt.Println(list)

}

func TestDocumentMutationUpdate(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	entity := hyper.NewEntity(hyper.NewEntityID("mintter:document", "doc-1"))
	dm, err := newDocumentMutation(entity, alice.Device, delegation, cid.Undef)
	require.NoError(t, err)

	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))
	require.NoError(t, dm.SetCreateTime(time.Now()))

	_, err = dm.Commit(ctx, blobs)
	require.NoError(t, err)

	entity, err = blobs.LoadEntity(ctx, "mintter:document:doc-1")
	require.NoError(t, err)
	require.Nil(t, entity)

	entity, err = blobs.LoadEntityWithDrafts(ctx, "mintter:document:doc-1")
	require.NoError(t, err)
	require.NotNil(t, entity)

	//
}
