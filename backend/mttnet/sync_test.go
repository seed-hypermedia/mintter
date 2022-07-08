package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestListObjects(t *testing.T) {
	t.Parallel()

	alice, stopalice := makeTestPeer(t, "alice")
	defer stopalice()
	ctx := context.Background()

	doc, err := alice.repo.CreateDocument(ctx)
	require.NoError(t, err)

	doc.ChangeTitle("Hello world")
	require.NoError(t, doc.MoveBlock("b1", "", ""))
	require.NoError(t, doc.ReplaceBlock(vcstypes.Block{
		ID:   "b1",
		Text: "Hello world",
	}))

	recorded, err := alice.repo.CommitPublication(ctx, doc, vcs.Version{})
	require.NoError(t, err)
	_ = recorded

	refs, err := alice.vcs.ListVersionsByOwner(ctx, alice.me.AccountID())
	require.NoError(t, err)

	require.Len(t, refs, 2)

	bob, stopbob := makeTestPeer(t, "bob")
	defer stopbob()

	require.NoError(t, bob.Connect(ctx, alice.AddrInfo()))

	c, err := bob.RPCClient(ctx, alice.me.DeviceKey().CID())
	require.NoError(t, err)

	list, err := c.ListObjects(ctx, &p2p.ListObjectsRequest{})
	require.NoError(t, err)

	require.Len(t, list.Objects, 3)
}

func TestSync(t *testing.T) {
	t.Parallel()

	alice, stopalice := makeTestPeer(t, "alice")
	defer stopalice()
	bob, stopbob := makeTestPeer(t, "bob")
	defer stopbob()
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

	doc, err := alice.repo.CreateDocument(ctx)
	require.NoError(t, err)

	doc.ChangeTitle("Hello world")
	require.NoError(t, doc.MoveBlock("b1", "", ""))
	require.NoError(t, doc.ReplaceBlock(vcstypes.Block{
		ID:   "b1",
		Text: "Hello world",
	}))

	recorded, err := alice.repo.CommitPublication(ctx, doc, vcs.Version{})
	require.NoError(t, err)

	res, err := bob.Sync(ctx)
	require.NoError(t, err)
	require.Equal(t, 0, res.NumSyncFailed)
	require.Equal(t, 2, res.NumSyncOK) // 1 for alice and 1 for our own device.

	bobdoc, err := bob.repo.LoadPublication(ctx, doc.State().ID, vcs.Version{})
	require.NoError(t, err)

	require.Equal(t, doc.State(), bobdoc.State())

	_ = recorded

	bobalice, err := bob.repo.LoadAccount(ctx, alice.me.AccountID(), vcs.Version{})
	require.NoError(t, err)
	require.NotNil(t, bobalice)
}
