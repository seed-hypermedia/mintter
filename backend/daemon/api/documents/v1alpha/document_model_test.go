package documents

import (
	"context"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestDocument_LoadingDrafts(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	entity := hyper.NewEntity(hyper.NewEntityID("mintter:document", "doc-1"))
	dm, err := newDocModel(entity, alice.Device, delegation)
	require.NoError(t, err)

	dm.nextHLC = dm.e.NextTimestamp() // TODO(burdiyan): this is a workaround that should not be necessary.

	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))
	require.NoError(t, dm.SetCreateTime(time.Now()))

	_, err = dm.Commit(ctx, blobs)
	require.NoError(t, err)

	entity, err = blobs.LoadEntity(ctx, "mintter:document:doc-1")
	require.NoError(t, err)
	require.Nil(t, entity)

	entity, err = blobs.LoadDraftEntity(ctx, "mintter:document:doc-1")
	require.NoError(t, err)
	require.NotNil(t, entity)
}

func TestDocument_DeleteTurnaround(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	entity := hyper.NewEntity(hyper.NewEntityID("mintter:document", "doc-1"))
	dm, err := newDocModel(entity, alice.Device, delegation)
	dm.nextHLC = dm.e.NextTimestamp() // TODO(burdiyan): this is a workaround that should not be necessary.
	require.NoError(t, err)

	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))
	require.NoError(t, dm.SetCreateTime(time.Now()))

	require.NoError(t, dm.MoveBlock("b1", "", ""))
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b1",
		Type: "statement",
		Text: "Hello World",
	}))
	require.NoError(t, dm.MoveBlock("b2", "", "b1"))
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b2",
		Type: "statement",
		Text: "Hi there!",
	}))
	require.NoError(t, dm.DeleteBlock("b1"))

	dm.cleanupPatch()

	want := map[string]any{
		"blocks": map[string]any{
			"b2": map[string]any{
				"#map": map[string]any{
					"text": "Hi there!",
					"type": "statement",
				},
			},
		},
		"moves": map[string]any{
			"#list": map[string]any{
				"#ins": []any{
					map[string]any{
						"b": "b2",
						"l": "",
						"p": "",
					},
				},
			},
		},
	}

	require.Equal(t, want["moves"], dm.patch["moves"])
	require.Equal(t, want["blocks"], dm.patch["blocks"])
}

func TestDocument_Cleanup(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	entity := hyper.NewEntity(hyper.NewEntityID("mintter:document", "doc-1"))
	dm, err := newDocModel(entity, alice.Device, delegation)
	dm.nextHLC = dm.e.NextTimestamp() // TODO(burdiyan): this is a workaround that should not be necessary.
	require.NoError(t, err)

	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))
	require.NoError(t, dm.SetCreateTime(time.Now()))

	require.NoError(t, dm.MoveBlock("b1", "", ""))
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b1",
		Type: "statement",
		Text: "Hello World",
	}))
	require.NoError(t, dm.MoveBlock("b2", "", "b1"))
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b2",
		Type: "statement",
		Text: "Hi there!",
	}))
	require.NoError(t, dm.DeleteBlock("b1"))
	require.NoError(t, dm.MoveBlock("b3", "", ""))
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b3",
		Type: "statement",
		Text: "New Front",
	}))
	require.NoError(t, dm.MoveBlock("b4", "", ""))
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b4",
		Type: "statement",
		Text: "New Front 2",
	}))

	touched := map[string]struct{}{}
	for _, blk := range dm.tree.localMoves {
		touched[blk] = struct{}{}
	}

	dm.cleanupPatch()

	want := map[string]any{
		"blocks": map[string]any{
			"b2": map[string]any{
				"#map": map[string]any{
					"text": "Hi there!",
					"type": "statement",
				},
			},
			"b3": map[string]any{
				"#map": map[string]any{
					"text": "New Front",
					"type": "statement",
				},
			},
			"b4": map[string]any{
				"#map": map[string]any{
					"text": "New Front 2",
					"type": "statement",
				},
			},
		},
		"moves": map[string]any{
			"#list": map[string]any{
				"#ins": []any{
					map[string]any{
						"b": "b4",
						"l": "",
						"p": "",
					},
					map[string]any{
						"b": "b3",
						"l": "b4@",
						"p": "",
					},
					map[string]any{
						"b": "b2",
						"l": "b3@",
						"p": "",
					},
				},
			},
		},
	}

	require.Equal(t, want["moves"], dm.patch["moves"])
	require.Equal(t, want["blocks"], dm.patch["blocks"])
}

func TestDocumentUpdatePublished(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := newTestSQLite(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	ctx := context.Background()
	delegation, err := daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now())
	require.NoError(t, err)
	eid := hyper.NewEntityID("mintter:document", "doc-1")
	entity := hyper.NewEntity(eid)
	dm, err := newDocModel(entity, alice.Device, delegation)
	dm.nextHLC = dm.e.NextTimestamp() // TODO(burdiyan): this is a workaround that should not be necessary.
	require.NoError(t, err)

	require.NoError(t, dm.SetAuthor(alice.Account.Principal()))
	require.NoError(t, dm.SetCreateTime(time.Now()))
	require.NoError(t, dm.SetTitle("My document"))

	hb, err := dm.Commit(ctx, blobs)
	require.NoError(t, err)

	require.NoError(t, blobs.PublishDraft(ctx, eid))

	entity, err = blobs.LoadEntity(ctx, eid)
	require.NoError(t, err)

	_, ok := entity.Heads()[hb.CID]
	require.True(t, ok, "entity must have last published change as heads")

	hb2, err := entity.CreateChange(entity.NextTimestamp(), alice.Device, delegation, map[string]any{})
	require.NoError(t, err)
	require.Equal(t, []cid.Cid{hb.CID}, hb2.Decoded.(hyper.Change).Deps, "new change must have old one in deps")

	require.NoError(t, blobs.SaveBlob(ctx, hb2))

	// dm, err = newDraftMutation(entity, alice.Device, delegation)
	// require.NoError(t, err)

	// require.NoError(t, dm.SetTitle("My changed title"))
	// hb2, err := dm.Commit(ctx, blobs)
	// require.NoError(t, err)
	// require.Equal(t, []cid.Cid{hb.CID}, hb2.Decoded.(hyper.Change).Deps, "new change must have old one in deps")
}
