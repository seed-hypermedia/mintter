package docmodel

import (
	"context"
	"seed/backend/core"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hlc"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/pkg/must"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestDocument_IgnoreRedundantReplaces(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	ctx := context.Background()

	dm := newTestDocModel(t, blobs, alice.Account, alice.Device)
	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b1",
		Type: "statement",
		Text: "Hello World",
	}))

	hb, err := dm.Change()
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, hb))

	entity, err := blobs.LoadEntity(ctx, dm.e.ID())
	require.NoError(t, err)
	require.NotNil(t, entity)

	dm, err = New(entity, alice.Device, dm.delegation)
	require.NoError(t, err)
	dm.nextHLC = entity.NextTimestamp()

	require.NoError(t, dm.ReplaceBlock(&documents.Block{
		Id:   "b1",
		Type: "statement",
		Text: "Hello World",
	}))

	hb, err = dm.Change()
	require.NoError(t, err)
	patch := hb.Decoded.(hyper.Change).Patch
	require.Equal(t, map[string]any{"isDraft": true}, patch)
}

func TestDocument_LoadingDrafts(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	ctx := context.Background()

	dm := newTestDocModel(t, blobs, alice.Account, alice.Device)
	_, err := dm.Commit(ctx, blobs)
	require.NoError(t, err)

	entity, err := blobs.LoadEntity(ctx, dm.e.ID())
	require.NoError(t, err)
	require.Nil(t, entity)

	entity, err = blobs.LoadDraftEntity(ctx, dm.e.ID())
	require.NoError(t, err)
	require.NotNil(t, entity)
}

func TestDocument_DeleteTurnaround(t *testing.T) {
	alice := coretest.NewTester("alice")
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	dm := newTestDocModel(t, blobs, alice.Account, alice.Device)

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
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	dm := newTestDocModel(t, blobs, alice.Account, alice.Device)

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
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	ctx := context.Background()
	dm := newTestDocModel(t, blobs, alice.Account, alice.Device)

	require.NoError(t, dm.SetTitle("My document"))

	hb, err := dm.Commit(ctx, blobs)
	require.NoError(t, err)

	_, err = blobs.PublishDraft(ctx, dm.e.ID())
	require.NoError(t, err)

	entity, err := blobs.LoadEntity(ctx, dm.e.ID())
	require.NoError(t, err)

	_, ok := entity.Heads()[hb.CID]
	require.True(t, ok, "entity must have last published change as heads")

	hb2, err := entity.CreateChange(entity.NextTimestamp(), alice.Device, dm.delegation, map[string]any{
		"isDraft": true,
	}, hyper.WithAction("Update"))
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

func TestBug_RedundantMoves(t *testing.T) {
	alice := coretest.NewTester("alice")
	kd := must.Do2(hyper.NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now())).Blob()

	// Create draft.
	var c1 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		model := must.Do2(New(entity, alice.Device, kd.CID))
		must.Do(model.SetCreateTime(time.Now()))
		must.Do(model.SetTitle("Hello World!"))
		must.Do(model.SetAuthor(alice.Account.Principal()))
		model.nextHLC = entity.NextTimestamp()
		c1 = must.Do2(model.Change())
	}

	// Update draft in place.
	{
		entity := hyper.NewEntity("hm://d/foo")
		model := must.Do2(New(entity, alice.Device, kd.CID))
		must.Do(model.RestoreDraft(c1.CID, c1.Decoded.(hyper.Change)))
		must.Do(model.MoveBlock("b1", "", ""))
		must.Do(model.ReplaceBlock(&documents.Block{
			Id:   "b1",
			Text: "Hello",
		}))
		must.Do(model.MoveBlock("b2", "", "b1"))
		must.Do(model.ReplaceBlock(&documents.Block{
			Id:   "b2",
			Text: "World",
		}))
		c1 = must.Do2(model.Change())
	}

	// Create a new change on top of the previous.
	var c2 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		must.Do(model.MoveBlock("b1", "", ""))
		must.Do(model.MoveBlock("b2", "", "b1"))
		must.Do(model.MoveBlock("b3", "", "b2"))
		must.Do(model.MoveBlock("b3", "", "b2"))
		must.Do(model.ReplaceBlock(&documents.Block{
			Id:   "b2",
			Text: "Another block",
		}))

		c2 = must.Do2(model.Change())
	}

	// Try to apply changes one by one.
	entity := hyper.NewEntity("hm://d/foo")
	must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
	must.Do(entity.ApplyChange(c2.CID, c2.Decoded.(hyper.Change)))
	model := must.Do2(New(entity, alice.Device, kd.CID))
	_ = model
}

func TestBug_DraftWithMultipleDeps(t *testing.T) {
	alice := coretest.NewTester("alice")
	kd := must.Do2(hyper.NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now())).Blob()

	// Create document.
	var c1 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		model := must.Do2(New(entity, alice.Device, kd.CID))
		must.Do(model.SetCreateTime(time.Now()))
		must.Do(model.SetTitle("Hello World!"))
		must.Do(model.SetAuthor(alice.Account.Principal()))
		model.nextHLC = entity.NextTimestamp()
		c1 = must.Do2(model.Change())
	}

	// Create two concurrent changes.
	var c2 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		must.Do(model.SetTitle("Changing title 1"))
		c2 = must.Do2(model.Change())
	}

	var c3 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		must.Do(model.SetTitle("Changing title 2"))
		c3 = must.Do2(model.Change())
	}

	// Create draft from the all the changes.
	var draft hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
		must.Do(entity.ApplyChange(c2.CID, c2.Decoded.(hyper.Change)))
		must.Do(entity.ApplyChange(c3.CID, c3.Decoded.(hyper.Change)))

		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		require.Len(t, model.e.Heads(), 2, "current document state must have 2 heads")
		must.Do(model.SetTitle("The final title!"))
		draft = must.Do2(model.Change())
	}

	// Update the draft in place.
	{
		entity := hyper.NewEntity("hm://d/foo")
		must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
		must.Do(entity.ApplyChange(c2.CID, c2.Decoded.(hyper.Change)))
		must.Do(entity.ApplyChange(c3.CID, c3.Decoded.(hyper.Change)))

		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		must.Do(model.RestoreDraft(draft.CID, draft.Decoded.(hyper.Change)))
		require.Len(t, model.e.Heads(), 2, "current document state must have 2 heads")
		must.Do(model.SetTitle("The final title updated!"))
		draft = must.Do2(model.Change())
	}

	require.Equal(t, hyper.SortCIDs([]cid.Cid{c2.CID, c3.CID}), draft.Decoded.(hyper.Change).Deps, "draft must have concurrent changes as deps")
}

func TestBug_UndeletableBlock(t *testing.T) {
	t.Parallel()

	alice := coretest.NewTester("alice")
	kd := must.Do2(hyper.NewKeyDelegation(alice.Account, alice.Device.PublicKey, time.Now())).Blob()

	// Alice creates a block.
	var c1 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		must.Do(model.SetCreateTime(time.Now()))
		must.Do(model.SetTitle("Hello World!"))
		must.Do(model.SetAuthor(alice.Account.Principal()))
		must.Do(model.MoveBlock("b1", "", ""))
		must.Do(model.ReplaceBlock(&documents.Block{Id: "b1", Type: "paragraph"}))
		model.nextHLC = entity.NextTimestamp()
		c1 = must.Do2(model.Change())
	}

	want := map[string]any{
		"moves": map[string]any{
			"#list": map[string]any{
				"#ins": []any{
					map[string]any{
						"b": "b1",
						"p": "",
						"l": "",
					},
				},
			},
		},
	}

	require.Equal(t, want["moves"], c1.Decoded.(hyper.Change).Patch["moves"], "c1 must create a block")

	// Alice deletes a block in a new change.
	var c2 hyper.Blob
	{
		entity := hyper.NewEntity("hm://d/foo")
		must.Do(entity.ApplyChange(c1.CID, c1.Decoded.(hyper.Change)))
		model := must.Do2(New(entity, alice.Device, kd.CID))
		model.nextHLC = entity.NextTimestamp()
		must.Do(model.DeleteBlock("b1"))
		c2 = must.Do2(model.Change())
	}

	want = map[string]any{
		"moves": map[string]any{
			"#list": map[string]any{
				"#ins": []any{
					map[string]any{
						"b": "b1",
						"p": TrashNodeID,
						"l": "",
					},
				},
			},
		},
	}

	require.Equal(t, want, c2.Decoded.(hyper.Change).Patch, "c2 must delete a block")
}

func newTestDocModel(t *testing.T, blobs *hyper.Storage, account, device core.KeyPair) *Document {
	clock := hlc.NewClock()
	ts := clock.MustNow()
	now := ts.Time().Unix()

	id, nonce := hyper.NewUnforgeableID("", account.Principal(), nil, now)
	delegation, err := daemon.Register(context.Background(), blobs, account, device.PublicKey, time.Now())
	require.NoError(t, err)

	entity := hyper.NewEntity(hyper.EntityID(id))
	dm, err := New(entity, device, delegation)
	require.NoError(t, err)

	dm.patch["nonce"] = nonce
	dm.patch["createTime"] = int(now)
	dm.patch["owner"] = []byte(account.Principal())
	dm.nextHLC = ts

	return dm
}
