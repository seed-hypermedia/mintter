package mttnet

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"testing"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestListObjects(t *testing.T) {
	t.Parallel()

	alice, stopalice := makeTestPeer(t, "alice")
	defer stopalice()
	ctx := context.Background()

	del, err := getDelegation(ctx, alice.me, alice.blobs)
	require.NoError(t, err)

	entity := hyper.NewEntity("alice-test-id")
	blob, err := entity.CreateChange(entity.NextTimestamp(), alice.me.DeviceKey(), del, map[string]any{
		"name": "alice",
	})
	require.NoError(t, err)

	require.NoError(t, alice.blobs.SaveBlob(ctx, blob))

	bob, stopbob := makeTestPeer(t, "bob")
	defer stopbob()

	require.NoError(t, bob.Connect(ctx, alice.AddrInfo()))

	c, err := bob.client.Dial(ctx, alice.me.DeviceKey().PeerID())
	require.NoError(t, err)

	list, err := c.ListObjects(ctx, &p2p.ListObjectsRequest{})
	require.NoError(t, err)

	require.Len(t, list.Objects, 2)

	blobs, err := c.ListBlobs(ctx, &p2p.ListBlobsRequest{})
	require.NoError(t, err)

	var count int
	for {
		blob, err := blobs.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		count++
		_ = blob
	}
	require.Equal(t, 4, count, "must have 4 blobs in the list")
}

func getDelegation(ctx context.Context, me core.Identity, blobs *hyper.Storage) (cid.Cid, error) {
	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := me.Account().Principal()
		dev := me.DeviceKey().Principal()

		list, err := hypersql.KeyDelegationsList(conn, acc)
		if err != nil {
			return err
		}

		for _, res := range list {
			if bytes.Equal(dev, res.KeyDelegationsViewDelegate) {
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobMultihash)
				return nil
			}
		}

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return out, fmt.Errorf("BUG: failed to find our own key delegation")
	}

	return out, nil
}
