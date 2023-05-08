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
	dm, err := newDraftMutation(entity, alice.Device, delegation)
	require.NoError(t, err)

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
	dm, err := newDraftMutation(entity, alice.Device, delegation)
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
		"blocks": map[string]interface{}{
			"b2": map[string]interface{}{
				"#map": map[string]interface{}{
					"text": "Hi there!",
					"type": "statement",
				},
			},
		},
		"moves": map[string]interface{}{
			"#list": map[string]interface{}{
				"#ins": []interface{}{
					map[string]interface{}{
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
