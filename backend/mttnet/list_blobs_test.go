package mttnet

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"seed/backend/core"
	p2p "seed/backend/genproto/p2p/v1alpha"
	"seed/backend/hyper"
	"seed/backend/hyper/hypersql"
	"testing"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"
)

func TestListBlobs(t *testing.T) {
	panic("TODO(hm24): fix the test")
	// t.Parallel()

	// alice, stopalice := makeTestPeer(t, "alice")
	// defer stopalice()
	// ctx := context.Background()
	// lis := bufconn.Listen(1024 * 1024) // mocked connection.
	// go func() {
	// 	if err := alice.grpc.Serve(lis); err != nil {
	// 		panic(err)
	// 	}
	// }()

	// del, err := getDelegation(ctx, alice.me, alice.blobs)
	// require.NoError(t, err)

	// entity := hyper.NewEntity("alice-test-id")
	// c1, err := entity.CreateChange(entity.NextTimestamp(), alice.me.DeviceKey(), del, map[string]any{
	// 	"name": "alice",
	// })
	// require.NoError(t, err)

	// require.NoError(t, alice.blobs.SaveBlob(ctx, c1))

	// blobs := flattenBlobStream(t, ctx, lis, "")
	// require.Len(t, blobs, 3, "alice must list 3 blobs initially")
	// cursor := blobs[2].Cursor
	// require.NotEqual(t, "", cursor, "last blob must have cursor")

	// blobs = flattenBlobStream(t, ctx, lis, blobs[2].Cursor)
	// require.Len(t, blobs, 0, "alice must not return any blobs after cursor")

	// // Make a draft change.
	// c2, err := entity.CreateChange(entity.NextTimestamp(), alice.me.DeviceKey(), del, map[string]any{
	// 	"draftField": true,
	// })
	// require.NoError(t, err)
	// require.NoError(t, alice.blobs.SaveDraftBlob(ctx, entity.ID(), c2))
	// blobs = flattenBlobStream(t, ctx, lis, cursor)
	// require.Len(t, blobs, 0, "alice must not list draft blobs")

	// // Make a non-draft change after draft.
	// c3, err := hyper.NewChange(entity.ID(), []cid.Cid{c1.CID}, entity.NextTimestamp(), alice.me.DeviceKey(), del, map[string]any{
	// 	"nonDraftField": true,
	// })
	// require.NoError(t, err)
	// require.NoError(t, alice.blobs.SaveBlob(ctx, c3))

	// blobs = flattenBlobStream(t, ctx, lis, cursor)
	// require.Len(t, blobs, 1, "alice must list 1 non-draft blob after cursor")
	// require.Equal(t, c3.CID.Bytes(), blobs[0].Cid, "alice must list the correct CID")
	// cursor = blobs[0].Cursor

	// blobs = flattenBlobStream(t, ctx, lis, cursor)
	// require.Len(t, blobs, 0, "alice must not list draft blobs")

	// _, err = alice.blobs.PublishDraft(ctx, entity.ID())
	// require.NoError(t, err, "alice must publish the draft")

	// blobs = flattenBlobStream(t, ctx, lis, cursor)
	// require.Len(t, blobs, 1, "alice must propagate published draft")
	// require.Equal(t, c2.CID.Bytes(), blobs[0].Cid, "alice draft blob CID must match")
}

func flattenBlobStream(t *testing.T, ctx context.Context, lis *bufconn.Listener, cursor string) []*p2p.Blob {
	t.Helper()

	conn, err := grpc.DialContext(ctx, "peer", grpc.WithInsecure(), grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	}))
	require.NoError(t, err)
	defer conn.Close()

	c := p2p.NewP2PClient(conn)

	var out []*p2p.Blob
	stream, err := c.ListBlobs(ctx, &p2p.ListBlobsRequest{Cursor: cursor})
	require.NoError(t, err)

	for {
		blob, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		out = append(out, blob)
	}

	return out
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
