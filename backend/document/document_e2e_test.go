package document_test

import (
	"mintter/backend/testutil"
	v2 "mintter/proto/v2"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestTransclusionEndToEnd(t *testing.T) {
	srv, _, ctx := makeV2Server(t, "alice")

	draft1, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err, "must create draft 1")
	updateReq1 := testDoc1(draft1)
	updateResp1, err := srv.UpdateDraft(ctx, updateReq1)
	require.NoError(t, err, "must update draft 1")
	require.NotNil(t, updateResp1)
	pub1, err := srv.PublishDraft(ctx, &v2.PublishDraftRequest{
		Version: draft1.Version,
	})
	require.NoError(t, err, "must publish draft 1")
	require.NotNil(t, pub1)

	draft2, err := srv.CreateDraft(ctx, &v2.CreateDraftRequest{})
	require.NoError(t, err, "must create draft 2")
	updateReq2 := testDoc2(draft2, pub1.Version)
	updateResp2, err := srv.UpdateDraft(ctx, updateReq2)
	require.NoError(t, err, "must update draft 2")
	require.NotNil(t, updateResp2)

	pubDoc, err := srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Version: pub1.Version,
	})
	require.NoError(t, err, "must get published doc 1")

	draftDoc, err := srv.GetDocument(ctx, &v2.GetDocumentRequest{
		Id: draft2.Id,
	})
	require.NoError(t, err, "must get draft 2")

	for _, reusedID := range []string{"block-list-parent", "block-list-child-1", "block-list-child-2"} {
		want := pubDoc.Blocks[reusedID]
		got := draftDoc.Blocks[pub1.Version+"/"+reusedID]
		testutil.ProtoEqual(t, want, got, "block %s doesn't match", reusedID)
	}

	wantRootList := &v2.BlockRefList{
		Refs: []*v2.BlockRef{
			{Ref: "block-1"},
			{
				Ref: pub1.Version + "/" + "block-list-parent",
				BlockRefList: &v2.BlockRefList{
					Style: v2.BlockRefList_BULLET,
					Refs: []*v2.BlockRef{
						{Ref: pub1.Version + "/" + "block-list-child-1"},
						{Ref: pub1.Version + "/" + "block-list-child-2"},
					},
				},
			},
			{Ref: "block-2"},
		},
	}
	testutil.ProtoEqual(t, wantRootList, draftDoc.Document.BlockRefList, "ref list doesn't match")
}

func testDoc2(d *v2.Document, sourceVersion string) *v2.UpdateDraftRequest {
	d.Title = "Second document"
	d.Subtitle = "This is the first Mintter document that will reuse a block."
	d.BlockRefList = &v2.BlockRefList{
		Style: v2.BlockRefList_NONE,
		Refs: []*v2.BlockRef{
			{Ref: "block-1"},
			{
				Ref: sourceVersion + "/block-list-parent",
				BlockRefList: &v2.BlockRefList{
					Style: v2.BlockRefList_BULLET,
					Refs: []*v2.BlockRef{
						{Ref: sourceVersion + "/block-list-child-1"},
						{Ref: sourceVersion + "/block-list-child-2"},
					},
				},
			},
			{Ref: "block-2"},
		},
	}

	blockMap := map[string]*v2.Block{
		"block-1": {
			Id: "block-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "Bellow you see the reused block."},
					},
				},
			},
		},
		"block-2": {
			Id: "block-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "Cool, huh?"},
					},
				},
			},
		},
	}

	return &v2.UpdateDraftRequest{
		Document: d,
		Blocks:   blockMap,
	}
}

func testDoc1(d *v2.Document) *v2.UpdateDraftRequest {
	d.Title = "First document"
	d.Subtitle = "The first Mintter document from which a block will be reused."
	d.BlockRefList = &v2.BlockRefList{
		Style: v2.BlockRefList_NONE,
		Refs: []*v2.BlockRef{
			{Ref: "block-1"},
			{
				Ref: "block-list-parent",
				BlockRefList: &v2.BlockRefList{
					Style: v2.BlockRefList_BULLET,
					Refs: []*v2.BlockRef{
						{Ref: "block-list-child-1"},
						{Ref: "block-list-child-2"},
					},
				},
			},
			{Ref: "block-2"},
		},
	}

	blockMap := map[string]*v2.Block{
		"block-1": {
			Id: "block-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm just a line of text."},
					},
				},
			},
		},
		"block-2": {
			Id: "block-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm just a line of text "},
						{Text: "with", TextStyle: &v2.TextStyle{Bold: true}},
						{Text: " "},
						{Text: "some", TextStyle: &v2.TextStyle{Italic: true}},
						{Text: " "},
						{Text: "formatting", TextStyle: &v2.TextStyle{Bold: true, Underline: true}},
						{Text: "!"},
					},
				},
			},
		},
		"block-list-parent": {
			Id: "block-list-parent",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm a parent of a list."},
					},
				},
			},
		},
		"block-list-child-1": {
			Id: "block-list-child-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm the first list item."},
					},
				},
			},
		},
		"block-list-child-2": {
			Id: "block-list-child-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm the second list item."},
					},
				},
			},
		},
	}

	return &v2.UpdateDraftRequest{
		Document: d,
		Blocks:   blockMap,
	}
}
