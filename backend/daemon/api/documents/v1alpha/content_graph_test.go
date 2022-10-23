package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBacklinks(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotNil(t, draft)
	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})
	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotNil(t, draft2)
	draft2 = updateDraft(ctx, t, api, draft2.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "This will link to a document"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
			Annotations: []*documents.Annotation{
				{
					Type:   "link",
					Starts: []int32{0},
					Ends:   []int32{5},
					Attributes: map[string]string{
						"url": "mintter://" + pub.Document.Id + "/" + pub.Version + "/b1",
					},
				},
			},
		}}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b2",
			Type: "statement",
			Text: "Document link",
			Annotations: []*documents.Annotation{
				{
					Type:   "link",
					Starts: []int32{0},
					Ends:   []int32{5},
					Attributes: map[string]string{
						"url": "mtt://" + pub.Document.Id + "/" + pub.Version,
					},
				},
			},
		}}},
	})
	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft2.Id})
	require.NoError(t, err)
	require.NotNil(t, pub2)

	cits, err := api.ListCitations(ctx, &documents.ListCitationsRequest{
		DocumentId: pub.Document.Id,
	})
	require.NoError(t, err)

	want := &documents.ListCitationsResponse{
		Links: []*documents.Link{
			{
				Source: &documents.LinkNode{
					DocumentId: pub2.Document.Id,
					BlockId:    "b1",
					Version:    pub2.Version,
				},
				Target: &documents.LinkNode{
					DocumentId: pub.Document.Id,
					BlockId:    "b1",
					Version:    pub.Version,
				},
			},
			{
				Source: &documents.LinkNode{
					DocumentId: pub2.Document.Id,
					BlockId:    "b2",
					Version:    pub2.Version,
				},
				Target: &documents.LinkNode{
					DocumentId: pub.Document.Id,
					Version:    pub.Version,
				},
			},
		},
	}

	testutil.ProtoEqual(t, want, cits, "citations response doesn't match")
}
