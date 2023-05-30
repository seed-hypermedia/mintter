package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBug_BrokenPublicationList(t *testing.T) {
	// See: https://www.notion.so/mintter/Fix-List-of-Publications-Breaks-c5f37e237cca4618bd3296d926958cd6.
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})
	require.NoError(t, err)
	require.NotNil(t, updated)

	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.NotNil(t, published)

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotNil(t, draft2)

	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err, "must list publications correctly with existing drafts")
	require.Len(t, list.Publications, 1)

	dlist, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err, "must list drafts correctly with existing publications")
	require.Len(t, dlist.Documents, 1)
}

func TestBug_MoveBockWithoutReplacement(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
	})
	require.NoError(t, err)
	require.NotNil(t, updated)

	dlist, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err, "must list drafts correctly with existing publications")
	require.Len(t, dlist.Documents, 1)
}

func TestBug_MissingLinkTarget(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
			Annotations: []*documents.Annotation{
				{
					Type: "link",
					Attributes: map[string]string{
						"url": "mtt://bafy2bzaceaemtzyq7gj6fa5jn4xhfq6yp657j5dpoqvh6bio4kk4bi2wmoroy/baeaxdiheaiqfsiervpfvbohhvjgnkcto3f5p4alwe4k46fr334vlw4n5jaknnqa/MIWneLC1",
					},
					Starts: []int32{0},
					Ends:   []int32{5},
				},
			},
		}}},
	})
	require.NoError(t, err)
	require.NotNil(t, updated)
	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.NotNil(t, published)

	linked, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: "bafy2bzaceaemtzyq7gj6fa5jn4xhfq6yp657j5dpoqvh6bio4kk4bi2wmoroy"})
	require.Error(t, err)
	require.Nil(t, linked)
}

func TestBug_BlockRevisionMustUpdate(t *testing.T) {
	t.Parallel()

	// See: https://github.com/mintterteam/mintter/issues/1301.

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft1, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	draft1 = updateDraft(ctx, t, api, draft1.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})

	pub1, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft1.Id})
	require.NoError(t, err)

	blk := pub1.Document.Children[0]
	require.NotEqual(t, "", blk.Block.Revision)

	// Update draft.
	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub1.Document.Id})
	require.NoError(t, err)
	draft2 = updateDraft(ctx, t, api, draft2.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Updated!",
		}}},
	})
	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft2.Id})
	require.NoError(t, err)

	blkNew := pub2.Document.Children[0]
	require.NotEqual(t, "", blkNew.Block.Revision)
	require.NotEqual(t, blk.Block.Revision, blkNew.Block.Revision, "block revision must update")
}

func TestBug_HandleRedundantMoveOperations(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	docid := draft.Id

	calls := []*documents.UpdateDraftRequestV2{
		{
			DocumentId: docid,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "SZR8C9Pi",
						Parent:      "",
						LeftSibling: "",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:   "SZR8C9Pi",
						Type: "statement",
						Text: "Helllo",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:   "SZR8C9Pi",
						Type: "statement",
						Text: "Helllo",
					},
				}},
				{Op: &documents.DocumentChange_SetTitle{
					SetTitle: "Helllo",
				}},
			},
		},
		{
			DocumentId: docid,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "SZR8C9Pi",
						Parent:      "",
						LeftSibling: "",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:   "SZR8C9Pi",
						Type: "statement",
						Text: "Hello",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:   "SZR8C9Pi",
						Type: "statement",
						Text: "Hello",
					},
				}},
				{Op: &documents.DocumentChange_SetTitle{
					SetTitle: "Hello",
				}},
			},
		},
		{
			DocumentId: docid,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:       "SZR8C9Pi",
						Type:     "statement",
						Text:     "Hello",
						Revision: "bafy2bzacecb56hyyaz7h2w44wbzaciudpsgayltqluc2xbhx2553m56pe3jai",
					},
				}},
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "SZR8C9Pi",
						Parent:      "",
						LeftSibling: "",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:       "SZR8C9Pi",
						Type:     "statement",
						Text:     "Hello",
						Revision: "bafy2bzacecb56hyyaz7h2w44wbzaciudpsgayltqluc2xbhx2553m56pe3jai",
					},
				}},
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "yymUWK5V",
						Parent:      "",
						LeftSibling: "SZR8C9Pi",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:          "yymUWK5V",
						Type:        "statement",
						Text:        "",
						Annotations: nil,
					},
				}},
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "yymUWK5V",
						Parent:      "",
						LeftSibling: "SZR8C9Pi",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:          "yymUWK5V",
						Type:        "statement",
						Text:        "",
						Annotations: nil,
						Revision:    "",
					},
				}},
				{Op: &documents.DocumentChange_SetTitle{
					SetTitle: "Hello",
				}},
			},
		},
	}

	for i, call := range calls {
		_, err = api.UpdateDraftV2(ctx, call)
		require.NoError(t, err, "failed call %d", i)
	}
}
