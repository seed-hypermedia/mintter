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
	"github.com/stretchr/testify/require"
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
	require.Len(t, dm.currentMoves, 2)
	require.NoError(t, dm.MoveBlock("b2", "", ""))
	require.NoError(t, dm.MoveBlock("b1", "", "b2"))
	require.Len(t, dm.currentMoves, 2)
	require.NoError(t, dm.MoveBlock("b3", "b1", ""))
	require.Len(t, dm.currentMoves, 3)
	require.NoError(t, dm.MoveBlock("b2", "b1", "b3"))
	require.Len(t, dm.currentMoves, 4)

	// Make sure cleanup works. Only take the last move per block.
	require.Len(t, dm.cleanupMoves(), 3)

	blob, err := dm.Commit(ctx, blobs)
	require.NoError(t, err)

	_ = blob
}

// xa
// b
// a

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

	entity, err = blobs.LoadEntity(ctx, "mintter:document:doc-1", hyper.WithLoadDrafts())
	require.NoError(t, err)
	require.NotNil(t, entity)

	//
}
