package documents

import (
	"context"
	. "seed/backend/genproto/documents/v1alpha"
	"seed/backend/pkg/must"
	"seed/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCommentsSmoke(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &CreateDraftRequest{})
	require.NoError(t, err)

	_, err = api.UpdateDraft(ctx, &UpdateDraftRequest{
		DocumentId: draft.Id,
		Changes: []*DocumentChange{
			{Op: &DocumentChange_SetTitle{SetTitle: "Document title"}},
		},
	})
	require.NoError(t, err)

	pub, err := api.PublishDraft(ctx, &PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	target := pub.Document.Id + "?v=" + pub.Version

	cmt, err := api.CreateComment(ctx, &CreateCommentRequest{
		Target: target,
		Content: []*BlockNode{{
			Block: &Block{
				Id:   "b1",
				Type: "paragraph",
				Text: "Hello World",
			},
		}},
	})
	require.NoError(t, err)

	me := must.Do2(api.keys.GetKey(ctx, "main"))

	require.Equal(t, target, cmt.Target, "top-level comment must target document")
	require.NotNil(t, cmt.CreateTime, "create time must be set")
	require.Equal(t, me.String(), cmt.Author, "comment author must match my node")
	require.Equal(t, "", cmt.ThreadRoot, "top-level comment must not have thread root")
	require.Equal(t, "", cmt.RepliedComment, "top-level comment must not have replied comment")

	reply, err := api.CreateComment(ctx, &CreateCommentRequest{
		Target:         target,
		RepliedComment: cmt.Id,
		Content: []*BlockNode{{
			Block: &Block{
				Id:   "b1",
				Type: "paragraph",
				Text: "This is a reply",
			},
		}},
	})
	require.NoError(t, err)

	require.Equal(t, target, reply.Target, "reply must target the document")
	require.Equal(t, cmt.Id, reply.ThreadRoot, "reply must point to the thread root")
	require.Equal(t, cmt.Id, reply.RepliedComment, "reply must point to the replied comment")
	require.True(t, reply.CreateTime.AsTime().After(cmt.CreateTime.AsTime()), "reply time must be after replied comment time")

	reply2, err := api.CreateComment(ctx, &CreateCommentRequest{
		Target:         target,
		RepliedComment: reply.Id,
		Content: []*BlockNode{{
			Block: &Block{
				Id:   "b1",
				Type: "paragraph",
				Text: "This is another reply",
			},
		}},
	})
	require.NoError(t, err)

	require.Equal(t, target, reply2.Target, "nested reply must target thread root")
	require.Equal(t, cmt.Id, reply2.ThreadRoot, "nested reply must point to thread root")
	require.Equal(t, reply.Id, reply2.RepliedComment, "nested reply must point to the replied comment")
	require.True(t, reply2.CreateTime.AsTime().After(reply.CreateTime.AsTime()), "nested reply time must be after replied comment time")

	gotReply2, err := api.GetComment(ctx, &GetCommentRequest{Id: reply2.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, reply2, gotReply2, "reply must match when doing Get")

	list, err := api.ListComments(ctx, &ListCommentsRequest{
		Target: target,
	})
	require.Error(t, err, "listing for pinned target must fail")
	require.Nil(t, list)

	list, err = api.ListComments(ctx, &ListCommentsRequest{
		Target: pub.Document.Id,
	})
	require.NoError(t, err)

	want := &ListCommentsResponse{
		Comments: []*Comment{cmt, reply, reply2},
	}
	testutil.ProtoEqual(t, want, list, "list must match")
}
