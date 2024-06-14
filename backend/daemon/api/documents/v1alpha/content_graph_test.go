package documents

import (
	"context"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/testutil"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
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
					Ref:    pub.Document.Id + "?v=" + pub.Version + "#b1",
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
					Ref:    pub.Document.Id + "?v=" + pub.Version,
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

	// There's no defined order of how links are indexed, so between different test runs
	// this test was failing from time to time. We can't enforce the order here in an easy way,
	// so instead we check the returned links in an order-agnostic way to avoid flaky failures.

	makeSet := func(links []*documents.Link) map[string]*documents.Link {
		out := make(map[string]*documents.Link, len(links))
		for _, l := range links {
			data, err := protojson.Marshal(l)
			require.NoError(t, err)
			out[string(data)] = l
		}
		require.Len(t, out, len(links))
		return out
	}

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

	require.Equal(t, len(want.Links), len(cits.Links), "number of links must match")
	diff := cmp.Diff(makeSet(want.Links), makeSet(cits.Links), testutil.ExportedFieldsFilter())
	if diff != "" {
		t.Fatal(diff)
	}
}
