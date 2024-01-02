package documents

import (
	"context"
	. "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/testutil"
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

	cmt, err := api.CreateComment(ctx, &CreateCommentRequest{
		Target: pub.Document.Id + "?v=" + pub.Version,
		Content: []*BlockNode{{
			Block: &Block{
				Id:   "b1",
				Type: "paragraph",
				Text: "Hello World",
			},
		}},
	})
	require.NoError(t, err)

	require.Equal(t, pub.Document.Id+"?v="+pub.Version, cmt.Target, "comment target must match")
	require.NotNil(t, cmt.CreateTime, "create time must be set")
	require.Equal(t, api.me.MustGet().Account().String(), cmt.Author, "comment author must match my node")

	reply, err := api.CreateReply(ctx, &CreateReplyRequest{
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

	require.Equal(t, cmt.Id, reply.Target, "reply must target thread root")
	require.Equal(t, cmt.Id, reply.RepliedComment, "reply must point to the replied comment")
	require.True(t, reply.CreateTime.AsTime().After(cmt.CreateTime.AsTime()), "reply time must be after replied comment time")

	reply2, err := api.CreateReply(ctx, &CreateReplyRequest{
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

	require.Equal(t, cmt.Id, reply2.Target, "reply must target thread root")
	require.Equal(t, reply.Id, reply2.RepliedComment, "reply must point to the replied comment")

	gotReply2, err := api.GetComment(ctx, &GetCommentRequest{Id: reply2.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, reply2, gotReply2, "reply must match when doing Get")

	list, err := api.ListComments(ctx, &ListCommentsRequest{
		Target: pub.Document.Id + "?v=" + pub.Version,
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
