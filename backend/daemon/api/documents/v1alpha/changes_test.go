package documents

import (
	"context"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestChangeInfoAPI(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})
	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	{
		list, err := api.ListChanges(ctx, &documents.ListChangesRequest{DocumentId: pub.Document.Id})
		require.NoError(t, err)
		require.Len(t, list.Changes, 1, "publication must have one change")
		require.Equal(t, pub.Document.Children[0].Block.Revision, list.Changes[0].Id, "change ID must match block revision")

		change, err := api.GetChangeInfo(ctx, &documents.GetChangeInfoRequest{Id: list.Changes[0].Id})
		require.NoError(t, err)
		testutil.ProtoEqual(t, list.Changes[0], change, "get and list calls for changes must match")
	}

	// TODO(burdiyan): uncomment the test when conversations are fixed.
	// {
	// 	conv, err := api.CreateConversation(ctx, &documents.CreateConversationRequest{
	// 		DocumentId: pub.Document.Id,
	// 		Selectors: []*documents.Selector{
	// 			{
	// 				BlockId:       "b1",
	// 				Start:         0,
	// 				End:           5,
	// 				BlockRevision: pub.Document.Children[0].Block.Revision,
	// 			},
	// 		},
	// 		InitialComment: &documents.Block{
	// 			Type: "comment",
	// 			Id:   "c1",
	// 			Text: "What a mean statement!",
	// 		},
	// 	})
	// 	require.NoError(t, err)

	// 	cmt1 := conv.Comments[0]
	// 	cmt2, err := api.AddComment(ctx, &documents.AddCommentRequest{
	// 		ConversationId: conv.Id,
	// 		Comment: &documents.Block{
	// 			Id:   "c3",
	// 			Type: "comment",
	// 			Text: "Are you kidding me?",
	// 		},
	// 	})
	// 	require.NoError(t, err)
	// 	require.NotEqual(t, cmt1.Revision, cmt2.Revision)

	// 	c1, err := api.GetChangeInfo(ctx, &documents.GetChangeInfoRequest{Id: cmt1.Revision})
	// 	require.NoError(t, err)
	// 	require.Equal(t, c1.Id, cmt1.Revision)

	// 	c2, err := api.GetChangeInfo(ctx, &documents.GetChangeInfoRequest{Id: cmt2.Revision})
	// 	require.NoError(t, err)
	// 	require.Equal(t, c2.Id, cmt2.Revision)
	// 	require.False(t, proto.Equal(c1.CreateTime, c2.CreateTime), "changes must have different create time")

	// 	list, err := api.ListChanges(ctx, &documents.ListChangesRequest{
	// 		ObjectId: conv.Id,
	// 	})
	// 	require.NoError(t, err)

	// 	want := []*documents.ChangeInfo{c1, c2}
	// 	require.Len(t, list.Changes, len(want), "returned list must match added comments")
	// 	for i := range want {
	// 		testutil.ProtoEqual(t, want[i], list.Changes[i], "change %d in the list must match", i)
	// 	}
	// }
}

func TestChangesFields(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})
	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub.Document.Id})
	require.NoError(t, err)
	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Changed Title"}},
	})
	pub, err = api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	changes, err := api.ListChanges(ctx, &documents.ListChangesRequest{DocumentId: pub.Document.Id})
	require.NoError(t, err)

	require.Len(t, changes.Changes, 2, "list changes must return all changes")
	for i, c := range changes.Changes {
		require.NotEqual(t, "", c.Id, "change must have ID")
		require.NotEqual(t, "", c.Author, "change must have author")
		require.NotEqual(t, nil, c.CreateTime, "change must have create time")
		require.NotEqual(t, "", c.Version, "change must have version")

		if i == 0 {
			require.Nil(t, c.Deps, "first change must have no deps")
		} else {
			require.GreaterOrEqual(t, len(c.Deps), 1, "non-first changes must have at least one dep")
		}

		cc, err := api.GetChangeInfo(ctx, &documents.GetChangeInfoRequest{Id: c.Id})
		require.NoError(t, err)
		testutil.ProtoEqual(t, c, cc, "get change must return same data as list changes")
	}
}
