package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/mttdoc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestListObjects(t *testing.T) {
	t.Parallel()

	alice, stopalice := makeTestPeer(t, "alice")
	defer stopalice()
	ctx := context.Background()

	clock := hlc.NewClockWithWall(func() time.Time { return time.Time{} })
	perma, err := vcs.EncodePermanode(mttdoc.NewDocumentPermanode(alice.me.AccountID(), clock.Now()))
	require.NoError(t, err)
	ch := vcs.NewChange(alice.me, perma.ID, nil, vcsdb.KindOpaque, clock.Now(), []byte("opaque content"))
	vc, err := ch.Block()
	require.NoError(t, err)

	{
		conn, release, err := alice.vcs.Conn(ctx)
		require.NoError(t, err)

		err = conn.WithTx(true, func() error {
			conn.NewObject(perma)
			conn.StoreChange(vc)
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
