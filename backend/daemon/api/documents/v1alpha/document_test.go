package documents

import (
	"context"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
)

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

func TestDocument_LoadingDrafts(t *testing.T) {
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
}

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
