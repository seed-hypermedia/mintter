package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs/vcsdb"
	"mintter/backend/vcs/vcstypes"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestListObjects(t *testing.T) {
	t.Parallel()

	alice, stopalice := makeTestPeer(t, "alice")
	defer stopalice()
	ctx := context.Background()

	{
		conn, release, err := alice.vcs.Conn(ctx)
		require.NoError(t, err)

		err = conn.WithTx(true, func() error {
			perma, err := vcsdb.NewPermanode(vcstypes.NewDocumentPermanode(alice.me.AccountID()))
			if err != nil {
				return err
			}
			obj := conn.NewObject(perma)
			meLocal := conn.EnsureIdentity(alice.me)
			change := conn.NewChange(obj, meLocal, nil, time.Time{})
			newDatom := vcsdb.MakeDatomFactory(change, 1, 0)

			conn.AddDatom(obj, newDatom(vcsdb.RootNode, "title", "This is a title"))
			conn.SaveVersion(obj, "main", meLocal, vcsdb.LocalVersion{change})
			conn.EncodeChange(change, alice.me.DeviceKey())

			refs := conn.ListAllVersions("main")
			require.Len(t, refs, 2)

			return nil
		})
		release()
		require.NoError(t, err)
	}

	bob, stopbob := makeTestPeer(t, "bob")
	defer stopbob()

	require.NoError(t, bob.Connect(ctx, alice.AddrInfo()))

	c, err := bob.client.DialDevice(ctx, alice.me.DeviceKey().CID())
	require.NoError(t, err)

	list, err := c.ListObjects(ctx, &p2p.ListObjectsRequest{})
	require.NoError(t, err)

	require.Len(t, list.Objects, 2)
}
