package server_test

import (
	"context"
	"testing"

	"mintter/backend/server"
	"mintter/backend/testutil"
	"mintter/proto"
	v2 "mintter/proto/v2"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestV2CreateDraft(t *testing.T) {
	srv, prof, ctx := makeV2Server(t, "alice")

	_, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{
		Parent: "fake-publicattion",
	})
	require.Error(t, err, "creating draft with parent is not implemented yet and must fail")

	doc, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err, "creating new draft must not fail")

	_, err = cid.Decode(doc.Id)
	require.NoError(t, err, "document ID must be a valid CID")

	require.Equal(t, prof.AccountId, doc.Author, "document author must be the current user")
	require.NotNil(t, doc.CreateTime, "document must have create time")
	require.NotNil(t, doc.UpdateTime, "document must have create time")
	require.Equal(t, doc.CreateTime, doc.UpdateTime, "document create time and update time must be the same")
	require.Equal(t, doc.PublishingState, v2.PublishingState_DRAFT, "document must have DRAFT publishing state")
	require.Nil(t, doc.PublishTime, "publish time must be nil in drafts")
	require.Empty(t, doc.Parent, "new draft must have no parent")
	require.Nil(t, doc.BlockRefList, "new draft must have no block ref list")
	require.NotEqual(t, "", doc.Version, "drafts must have stable version")
}

// TODO(burdiyan): test create draft with parent

func TestV2UpdateDraft(t *testing.T) {
	srv, _, ctx := makeV2Server(t, "alice")

	draft, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err)

	draft.Title = "Blocks in Mintter"
	draft.Subtitle = "This is how Mintter works with blocks as units of content"
	draft.BlockRefList = &v2.BlockRefList{
		Blocks: []*v2.BlockRef{
			{Id: "block-1"},
			{
				Id: "block-list-parent",
				BlockRefList: &v2.BlockRefList{
					Blocks: []*v2.BlockRef{
						{Id: "block-list-child-1"},
						{Id: "block-list-child-2"},
					},
				},
			},
			{Id: "block-2"},
		},
	}

	blocksMap := makeTestBlocks()

	update := &v2.UpdateDraftRequest{
		Document: draft,
		Blocks:   blocksMap,
	}

	// TODO:
	// Blocks with no ID must fail.
	// Sending blocks not in the EDL must fail.
	// Sending blocks from other documents must fail (or be ignored?)

	resp, err := srv.UpdateDraft(ctx, update)
	require.NoError(t, err, "updating draft must not fail")
	require.NotNil(t, resp, "response must not be nil")

	updated, err := srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Id: draft.Id,
	})
	require.NoError(t, err)
	require.NotNil(t, updated)

	for k, b := range blocksMap {
		testutil.ProtoEqual(t, b, updated.Blocks[k], "block %s doesn't match", k)
	}
}

func TestListDocuments_Draft(t *testing.T) {
	srv, _, ctx := makeV2Server(t, "alice")

	d1, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err)
	d2, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err)
	d3, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err)

	expected := map[string]*v2.Document{
		d1.Id: d1,
		d2.Id: d2,
		d3.Id: d3,
	}

	resp, err := srv.ListDocuments(ctx, &v2.ListDocumentsRequest{})
	require.NoError(t, err, "listing drafts must not fail")
	require.NotNil(t, resp, "listing drafts must return a result")

	respMap := map[string]*v2.Document{}

	for _, d := range resp.Documents {
		respMap[d.Id] = d
	}

	for id, wantDoc := range expected {
		testutil.ProtoEqual(t, wantDoc, respMap[id], "document with id %s doesn't match", id)
	}
}

func TestDeleteDocument(t *testing.T) {
	srv, _, ctx := makeV2Server(t, "alice")

	d1, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err, "must create draft")
	require.NotNil(t, d1)

	updateResp, err := srv.UpdateDraft(ctx, &v2.UpdateDraftRequest{
		Document: d1,
		Blocks:   makeTestBlocks(),
	})
	require.NoError(t, err)
	require.NotNil(t, updateResp)

	resp, err := srv.DeleteDocument(ctx, &v2.DeleteDocumentRequest{
		Version: d1.Version,
	})
	require.NoError(t, err, "deleting draft must not fail")
	require.NotNil(t, resp, "must return a response when deleting a document")

	doc, err := srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Id: d1.Id,
	})
	require.Error(t, err, "retriving a deleted document must fail")
	require.Nil(t, doc)
}

func TestPublishDraft_v2(t *testing.T) {
	srv, _, ctx := makeV2Server(t, "alice")

	d1, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err, "must create draft")
	require.NotNil(t, d1)

	d1.Title = "My published document"

	updateResp, err := srv.UpdateDraft(ctx, &v2.UpdateDraftRequest{
		Document: d1,
		Blocks:   makeTestBlocks(),
	})
	require.NoError(t, err, "must update draft")
	require.NotNil(t, updateResp)

	published, err := srv.PublishDraft(ctx, &v2.PublishDraftRequest{
		Version: d1.Version,
	})
	require.NoError(t, err, "must publish draft")
	require.NotNil(t, published)

	doc, err := srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Version: d1.Version,
	})
	require.Error(t, err, "must fail to get published draft by its draft version")
	require.Nil(t, doc)

	doc, err = srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Id: d1.Id,
	})
	require.Error(t, err, "must fail to get published draft by just the document ID")
	require.Nil(t, doc)

	doc, err = srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Version: published.Version,
	})
	require.NoError(t, err, "must get published document by its published version")
	require.NotNil(t, doc)

	list, err := srv.ListDocuments(ctx, &v2.ListDocumentsRequest{
		PublishingState: v2.PublishingState_PUBLISHED,
		Author:          d1.Author,
	})
	require.NoError(t, err, "must list documents")
	require.NotNil(t, list.Documents, "must return the list of documents")
	testutil.ProtoEqual(t, doc.Document, list.Documents[0], "listed document must be the same as retrieved")
}

func makeV2Server(t *testing.T, name string) (v2.DocumentsServer, *proto.Profile, context.Context) {
	t.Helper()
	srv := newSeededServer(t, name)
	t.Cleanup(func() {
		require.NoError(t, srv.Close())
	})
	ctx := context.Background()

	prof := getServerProfile(t, context.Background(), srv)

	return server.NewV2Server(srv, testutil.MakeBlockStore(t), testutil.MakeDatastore(t)), prof, ctx
}

func makeTestBlocks() map[string]*v2.Block {
	return map[string]*v2.Block{
		"block-1": {
			Id: "block-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{
							Text: "I'm just a line of text.",
						},
					},
				},
			},
		},
		"block-2": {
			Id: "block-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{
							Text: "I'm just a line of text ",
						},
						{
							Text: "with",
							TextStyle: &v2.TextStyle{
								Bold: true,
							},
						},
						{
							Text: " ",
						},
						{
							Text: "some",
							TextStyle: &v2.TextStyle{
								Italic: true,
							},
						},
						{
							Text: " ",
						},
						{
							Text: "formatting",
							TextStyle: &v2.TextStyle{
								Bold:      true,
								Underline: true,
							},
						},
						{
							Text: "!",
						},
					},
				},
			},
		},
		"block-list-parent": {
			Id: "block-list-parent",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{
							Text: "I'm a parent of a list.",
						},
					},
				},
			},
		},
		"block-list-child-1": {
			Id: "block-list-child-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{
							Text: "I'm the first list item.",
						},
					},
				},
			},
		},
		"block-list-child-2": {
			Id: "block-list-child-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{
							Text: "I'm the second list item.",
						},
					},
				},
			},
		},
	}
}
