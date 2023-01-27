package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCreateConversation(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
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

	cmt1 := &documents.Block{
		Type: "comment",
		Id:   "c1",
		Text: "What a mean statement!",
	}
	conv, err := api.CreateConversation(ctx, &documents.CreateConversationRequest{
		DocumentId: pub.Document.Id,
		Selectors: []*documents.Selector{
			{
				BlockId:       "b1",
				Start:         0,
				End:           5,
				BlockRevision: pub.Document.Children[0].Block.Revision,
			},
		},
		InitialComment: cmt1,
	})
	require.NoError(t, err)
	require.NotNil(t, conv)

	require.Len(t, conv.Comments, 1, "must have initial comment")
	cmt1.Revision = conv.Comments[0].Revision
	testutil.ProtoEqual(t, cmt1, conv.Comments[0], "initial comment must match")
	require.NotEqual(t, "", conv.Comments[0].Revision, "comment must have last change ID")
}

func TestAddComment(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
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

	// Adding first conversation.
	{
		conv, err := api.CreateConversation(ctx, &documents.CreateConversationRequest{
			DocumentId: pub.Document.Id,
			Selectors: []*documents.Selector{
				{
					BlockId:       "b1",
					Start:         0,
					End:           5,
					BlockRevision: pub.Document.Children[0].Block.Revision,
				},
			},
			InitialComment: &documents.Block{
				Type: "comment",
				Id:   "c1",
				Text: "What a mean statement!",
			},
		})
		require.NoError(t, err)

		// Validate initial comment.
		var cmt1 *documents.Block
		{
			cmt1 = &documents.Block{
				Id:   "c2",
				Type: "comment",
				Text: "No, that's actually a great comment!",
			}
			resp, err := api.AddComment(ctx, &documents.AddCommentRequest{
				ConversationId: conv.Id,
				Comment:        cmt1,
			})
			require.NoError(t, err)
			require.NotEqual(t, "", resp.Revision, "added comment must have last change id")
			cmt1.Revision = resp.Revision
			testutil.ProtoEqual(t, cmt1, resp, "returned comment must match")
		}

		// Validate second comment.
		var cmt2 *documents.Block
		{
			cmt2 = &documents.Block{
				Id:   "c3",
				Type: "comment",
				Text: "Are you kidding me?",
			}
			resp, err := api.AddComment(ctx, &documents.AddCommentRequest{
				ConversationId: conv.Id,
				Comment:        cmt2,
			})
			require.NoError(t, err)
			require.NotEqual(t, "", resp.Revision, "added comment must have last change id")
			cmt2.Revision = resp.Revision
			testutil.ProtoEqual(t, cmt2, resp, "returned comment must match")
		}

		require.NotEqual(t, cmt1.Revision, cmt2.Revision, "comments must have different revisions")
	}
}

func TestListConversations_Single(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
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

	conv1, err := api.CreateConversation(ctx, &documents.CreateConversationRequest{
		DocumentId: pub.Document.Id,
		Selectors: []*documents.Selector{
			{
				BlockId:       "b1",
				Start:         0,
				End:           5,
				BlockRevision: pub.Document.Children[0].Block.Revision,
			},
		},
		InitialComment: &documents.Block{
			Id:   "c1",
			Type: "comment",
			Text: "What a mean statement!",
		},
	})
	require.NoError(t, err)

	cmt1 := conv1.Comments[0]
	cmt2, err := api.AddComment(ctx, &documents.AddCommentRequest{
		ConversationId: conv1.Id,
		Comment: &documents.Block{
			Id:   "c2",
			Type: "comment",
			Text: "No, that's actually a great comment!",
		},
	})
	require.NoError(t, err)

	list, err := api.ListConversations(ctx, &documents.ListConversationsRequest{
		DocumentId: pub.Document.Id,
	})
	require.NoError(t, err)

	testutil.ProtoEqual(t, cmt1, list.Conversations[0].Comments[0], "1 listed comments must match added comment")
	testutil.ProtoEqual(t, cmt2, list.Conversations[0].Comments[1], "2 listed comments must match added comment")
}

func TestListConversations_ManyComments(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
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

	comments := map[string]*documents.Block{}

	conv1, err := api.CreateConversation(ctx, &documents.CreateConversationRequest{
		DocumentId: pub.Document.Id,
		Selectors: []*documents.Selector{
			{
				BlockId:       "b1",
				Start:         0,
				End:           5,
				BlockRevision: pub.Document.Children[0].Block.Revision,
			},
		},
		InitialComment: &documents.Block{
			Id:   "c1",
			Type: "comment",
			Text: "What a mean statement!",
		},
	})
	require.NoError(t, err)
	comments[conv1.Comments[0].Id] = conv1.Comments[0]

	cmt2, err := api.AddComment(ctx, &documents.AddCommentRequest{
		ConversationId: conv1.Id,
		Comment: &documents.Block{
			Id:   "c2",
			Type: "comment",
			Text: "No, that's actually a great comment!",
		},
	})
	require.NoError(t, err)
	comments[cmt2.Id] = cmt2

	conv2, err := api.CreateConversation(ctx, &documents.CreateConversationRequest{
		DocumentId: pub.Document.Id,
		Selectors: []*documents.Selector{
			{
				BlockId:       "b1",
				BlockRevision: pub.Document.Children[0].Block.Revision,
			},
		},
		InitialComment: &documents.Block{
			Id:   "c3",
			Type: "comment",
			Text: "I bet this whole block is just a test",
		},
	})
	require.NoError(t, err)
	comments[conv2.Comments[0].Id] = conv2.Comments[0]

	cmt4, err := api.AddComment(ctx, &documents.AddCommentRequest{
		ConversationId: conv2.Id,
		Comment: &documents.Block{
			Id:   "c4",
			Type: "comment",
			Text: "Indeed!",
		},
	})
	require.NoError(t, err)
	comments[cmt4.Id] = cmt4

	require.Len(t, comments, 4, "must have 4 comments total")

	list, err := api.ListConversations(ctx, &documents.ListConversationsRequest{
		DocumentId: pub.Document.Id,
	})
	require.NoError(t, err)

	got := map[string]*documents.Block{}

	require.Len(t, list.Conversations, 2, "must have 2 conversations")
	for _, conv := range list.Conversations {
		for _, cmt := range conv.Comments {
			got[cmt.Id] = cmt
		}
	}

	require.Equal(t, len(comments), len(got), "must list all added comments")

	for k := range got {
		want := comments[k]
		testutil.ProtoEqual(t, want, got[k], "comment %s doesn't match", k)
	}
}
