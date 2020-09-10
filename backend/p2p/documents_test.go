package p2p_test

import (
	"context"
	"mintter/backend/document"
	"mintter/backend/testutil"
	v2 "mintter/proto/v2"
	"testing"
	"time"

	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestSyncDocuments(t *testing.T) {
	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")
	ctx := document.AdminContext(context.Background())

	connectPeers(t, ctx, bob, alice)

	var pub1 *v2.GetDocumentResponse
	{
		doc, err := alice.DocServer().CreateDraft(ctx, &v2.CreateDraftRequest{})
		require.NoError(t, err)

		doc.Title = "My new document"

		_, err = alice.DocServer().UpdateDraft(ctx, &v2.UpdateDraftRequest{
			Document: doc,
		})
		require.NoError(t, err)

		pubResp, err := alice.DocServer().PublishDraft(ctx, &v2.PublishDraftRequest{
			Version: doc.Version,
		})
		require.NoError(t, err)
		require.NotNil(t, pubResp)

		alicePub, err := alice.DocServer().GetDocument(ctx, &v2.GetDocumentRequest{
			Version: pubResp.Version,
		})
		require.NoError(t, err)
		pub1 = alicePub
	}

	require.NoError(t, bob.SyncDocuments(ctx, alice.Account().ID))
	resp, err := bob.DocServer().ListDocuments(ctx, &v2.ListDocumentsRequest{
		Author:          alice.Account().ID.String(),
		PublishingState: v2.PublishingState_PUBLISHED,
	})
	require.NoError(t, err)

	testutil.ProtoEqual(t, pub1.Document, resp.Documents[0], "publications don't match")

	var pub2 *v2.GetDocumentResponse
	{
		doc, err := alice.DocServer().CreateDraft(ctx, &v2.CreateDraftRequest{})
		require.NoError(t, err)

		doc.Title = "My another document"

		_, err = alice.DocServer().UpdateDraft(ctx, &v2.UpdateDraftRequest{
			Document: doc,
		})
		require.NoError(t, err)

		pubResp, err := alice.DocServer().PublishDraft(ctx, &v2.PublishDraftRequest{
			Version: doc.Version,
		})
		require.NoError(t, err)
		require.NotNil(t, pubResp)

		alicePub, err := alice.DocServer().GetDocument(ctx, &v2.GetDocumentRequest{
			Version: pubResp.Version,
		})
		require.NoError(t, err)
		pub2 = alicePub
	}

	require.Eventually(t, func() bool {
		listResp, err := bob.DocServer().ListDocuments(ctx, &v2.ListDocumentsRequest{
			Author:          alice.Account().ID.String(),
			PublishingState: v2.PublishingState_PUBLISHED,
		})
		require.NoError(t, err)
		require.Len(t, listResp.Documents, 2, "bob must have 2 alice's documents")

		var ok bool
		for _, d := range listResp.Documents {
			if proto.Equal(pub2.Document, d) {
				ok = true
				break
			}
		}

		if !ok {
			litter.Dump(listResp)
			t.Fatal("none of the returned documents were the expected one")
			return false
		}

		return true
	}, 3*time.Second, 500*time.Millisecond, "bob must sync alice's new publication via pubsub")
}
