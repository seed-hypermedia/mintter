package documents

import (
	"context"
	"seed/backend/core"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/pkg/must"
	"seed/backend/testutil"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestAPICreateDraft(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	start := time.Now().Add(-3 * time.Second).UnixMicro()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotEqual(t, "", doc.Id)
	require.Equal(t, must.Do2(api.keys.GetKey(ctx, "main")).String(), doc.Author)
	require.False(t, doc.UpdateTime.AsTime().IsZero())
	require.False(t, doc.CreateTime.AsTime().IsZero())

	require.Greater(t, doc.CreateTime.AsTime().UnixMicro(), start)
	require.Greater(t, doc.UpdateTime.AsTime().UnixMicro(), start)

	require.NotEqual(t, "", doc.Author, "author must be set")
	require.Equal(t, []string{doc.Author}, doc.Editors, "editors must be set")
}

func TestAPICreateDraft_OnlyOneDraftAllowed(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	_, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: doc.Id})
	require.Error(t, err)
}

func TestAPIGetDraft_Simple(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	testutil.ProtoEqual(t, draft, got, "get draft must match created draft")
}

func TestUpdateDraft_SimpleAttributes(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	start := time.Now().Add(-4 * time.Second).UTC().UnixMicro()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	require.Greater(t, draft.CreateTime.AsTime().UnixMicro(), start)
	require.Greater(t, draft.UpdateTime.AsTime().UnixMicro(), start)
	require.Greater(t, draft.UpdateTime.AsTime().UnixMicro(), draft.CreateTime.AsTime().UnixMicro())
	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
	})
	require.Equal(t, draft.CreateTime, updated.CreateTime)

	require.Greater(t, updated.UpdateTime.AsTime().UnixMicro(), draft.UpdateTime.AsTime().UnixMicro())

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updated, got, "must get draft that was updated")

	require.Equal(t, "My new document title", got.Title)

	// Update again.
	updated = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My changed title"}},
	})
	got, err = api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updated, got, "must get draft that was updated")

	require.Equal(t, "My changed title", got.Title)
}

func TestUpdateDraft_WithBlocks(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	start := time.Now().Add(-2 * time.Second).UTC().UnixMicro()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	require.Greater(t, draft.CreateTime.AsTime().UnixMicro(), start)
	require.Greater(t, draft.UpdateTime.AsTime().UnixMicro(), start)
	require.Greater(t, draft.UpdateTime.AsTime().UnixMicro(), draft.CreateTime.AsTime().UnixMicro())

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})
	require.Equal(t, draft.CreateTime, updated.CreateTime)
	require.Greater(t, updated.UpdateTime.AsTime().UnixMicro(), draft.UpdateTime.AsTime().UnixMicro())

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updated, got, "must get draft that was updated")

	require.Equal(t, "My new document title", got.Title)
	require.Equal(t, "b1", got.Children[0].Block.Id, "block id must match")
	require.Nil(t, got.Children[0].Children, "block must not have children if not needed")
	require.Equal(t, "statement", got.Children[0].Block.Type, "block type must match")
	require.Equal(t, "Hello world!", got.Children[0].Block.Text, "block text must match")
}

func TestUpdateDraft_BlockRevisions(t *testing.T) {
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

	require.NotEqual(t, "", updated.Children[0].Block.Revision, "block must have revision id")
}

func TestUpdateDraftSmoke(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	resp, err := api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
		DocumentId: draft.Id,
		Changes: []*documents.DocumentChange{
			{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
			{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
			{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
				Id:   "b1",
				Type: "statement",
				Text: "Hello world!",
			}}},
			{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2", LeftSibling: "b1"}}},
			{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
				Id:   "b2",
				Type: "statement",
				Text: "Appended Block",
			}}},
		},
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
}

func TestUpdateDraft_Annotations(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{
			SetTitle: "Hello Drafts V2",
		}},
		{Op: &documents.DocumentChange_MoveBlock_{
			MoveBlock: &documents.DocumentChange_MoveBlock{
				BlockId:     "b1",
				Parent:      "",
				LeftSibling: "",
			},
		}},
		{Op: &documents.DocumentChange_ReplaceBlock{
			ReplaceBlock: &documents.Block{
				Id:         "b1",
				Type:       "statement",
				Text:       "This is the first paragraph.",
				Attributes: map[string]string{"childrenListStyle": "bullet"},
				Annotations: []*documents.Annotation{
					{
						Type:       "link",
						Attributes: map[string]string{"url": "https://exmaple.com"},
						Starts:     []int32{0},
						Ends:       []int32{5},
					},
				},
			},
		}},
	})

	want := []*documents.BlockNode{
		{
			Block: &documents.Block{
				Id:         "b1",
				Type:       "statement",
				Text:       "This is the first paragraph.",
				Attributes: map[string]string{"childrenListStyle": "bullet"},
				Annotations: []*documents.Annotation{
					{
						Type:       "link",
						Attributes: map[string]string{"url": "https://exmaple.com"},
						Starts:     []int32{0},
						Ends:       []int32{5},
					},
				},
			},
			Children: nil,
		},
	}

	require.Len(t, updated.Children, 1)
	for i := range want {
		want[i].Block.Revision = updated.Children[i].Block.Revision
		testutil.ProtoEqual(t, want[i], updated.Children[i], "updated draft block %d does't match", i)
	}
}

func TestAPIUpdateDraft_Complex(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	// === Add some content to the draft ===
	{
		_, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_SetTitle{SetTitle: "Hello Drafts V2"}},
				{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{
					BlockId: "b1", Parent: "", LeftSibling: "",
				}}},
				{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
					Id:   "b1",
					Text: "This is the first paragraph.",
				}}},
				{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{
					BlockId: "b1.1", Parent: "b1", LeftSibling: "",
				}}},
				{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
					Id:   "b1.1",
					Text: "This is a child of the first paragraph.",
				}}},

				{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{
					BlockId: "b2", Parent: "", LeftSibling: "",
				}}},
				{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
					Id:   "b2",
					Text: "This is inserted before the first paragraph.",
				}}},
			},
		})
		require.NoError(t, err)

		doc, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
		require.NoError(t, err)

		want := &documents.Document{
			Id:         draft.Id,
			Author:     draft.Author,
			Editors:    []string{draft.Author},
			Title:      "Hello Drafts V2",
			CreateTime: draft.CreateTime,
			UpdateTime: doc.UpdateTime,
			Children: []*documents.BlockNode{
				{
					Block: &documents.Block{
						Id:   "b2",
						Text: "This is inserted before the first paragraph.",
					},
				},
				{
					Block: &documents.Block{
						Id:   "b1",
						Text: "This is the first paragraph.",
					},
					Children: []*documents.BlockNode{
						{
							Block: &documents.Block{
								Id:   "b1.1",
								Text: "This is a child of the first paragraph.",
							},
						},
					},
				},
			},
			Version:         doc.Version,
			PreviousVersion: doc.PreviousVersion,
		}

		testutil.StructsEqual(want, doc).
			IgnoreFields(documents.Block{}, "Revision").
			Compare(t, "draft doesn't match the expected format")
	}

	// === Now reparent b1.1 ===
	{
		_, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "b1.1",
						Parent:      "",
						LeftSibling: "b2",
					},
				}},
			},
		})
		require.NoError(t, err)

		doc, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
		require.NoError(t, err)

		want := &documents.Document{
			Id:         draft.Id,
			Author:     draft.Author,
			Editors:    []string{draft.Author},
			Title:      "Hello Drafts V2",
			CreateTime: draft.CreateTime,
			UpdateTime: doc.UpdateTime,
			Children: []*documents.BlockNode{
				{
					Block: &documents.Block{
						Id:   "b2",
						Text: "This is inserted before the first paragraph.",
					},
				},
				{
					Block: &documents.Block{
						Id:   "b1.1",
						Text: "This is a child of the first paragraph.",
					},
				},
				{
					Block: &documents.Block{
						Id:   "b1",
						Text: "This is the first paragraph.",
					},
				},
			},
			Version:         doc.Version,
			PreviousVersion: doc.PreviousVersion,
		}

		diff := cmp.Diff(want, doc, testutil.ExportedFieldsFilter(), cmpopts.IgnoreFields(documents.Block{}, "Revision"))
		if diff != "" {
			t.Fatal(diff, "draft doesn't match after the first update")
		}
	}

	// === Now delete b1.1 ===
	{
		_, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_DeleteBlock{
					DeleteBlock: "b1.1",
				}},
			},
		})
		require.NoError(t, err)

		doc, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
		require.NoError(t, err)

		want := &documents.Document{
			Id:         draft.Id,
			Author:     draft.Author,
			Editors:    []string{draft.Author},
			Title:      "Hello Drafts V2",
			CreateTime: draft.CreateTime,
			UpdateTime: doc.UpdateTime,
			Children: []*documents.BlockNode{
				{
					Block: &documents.Block{
						Id:   "b2",
						Text: "This is inserted before the first paragraph.",
					},
				},
				{
					Block: &documents.Block{
						Id:   "b1",
						Text: "This is the first paragraph.",
					},
				},
			},
			Version:         doc.Version,
			PreviousVersion: doc.PreviousVersion,
		}

		diff := cmp.Diff(want, doc, testutil.ExportedFieldsFilter(), cmpopts.IgnoreFields(documents.Block{}, "Revision"))
		if diff != "" {
			t.Fatal(diff)
		}
	}
}

func TestListDrafts(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	draft.Version = "" // Drafts are listed without version.

	{
		list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
		require.NoError(t, err)
		testutil.ProtoEqual(t, draft, list.Documents[0], "must have draft in the list")
	}

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})
	updated.Children = nil
	require.Equal(t, draft.CreateTime.AsTime().UnixMicro(), updated.CreateTime.AsTime().UnixMicro())
	require.Greater(t, updated.UpdateTime.AsTime().UnixMicro(), draft.UpdateTime.AsTime().UnixMicro())

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	updated.Version = "" // Drafts are listed without version.
	testutil.ProtoEqual(t, updated, list.Documents[0], "must have draft in the list")
}

func TestAPIPublishDraft_E2E(t *testing.T) {
	t.Parallel()

	// We'll measure that dates on the published document are greater than start date.
	// Since the test runs fast we reverse the start time a bit to notice the difference.
	start := time.Now().Add(time.Minute * -1).UTC().Round(time.Second)

	// Move clock back a bit so that timestamps generated in tests
	// are clearly after the test start.
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

	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	testutil.StructsEqual(updated, published.Document).
		IgnoreFields(documents.Document{}, "PublishTime"). // drafts don't have publish time.
		Compare(t, "published document doesn't match the draft")

	require.NotEqual(t, "", published.Document.Id, "publication must have id")
	require.NotEqual(t, "", published.Version, "publication must have version")
	require.Equal(t, draft.Id, published.Document.Id)

	require.True(t, start.Before(published.Document.CreateTime.AsTime()), "create time must be after test start")
	require.True(t, start.Before(published.Document.UpdateTime.AsTime()), "update time must be after test start")
	require.True(t, start.Before(published.Document.PublishTime.AsTime()), "publish time must be after test start")

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Documents, 0, "published draft must be removed from drafts")

	// Draft must be removed after publishing.
	{
		draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{
			DocumentId: draft.Id,
		})
		require.Nil(t, draft, "draft must be removed after publishing")
		require.Error(t, err, "must fail to get published draft")
	}

	got, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.NoError(t, err, "must get document after publishing")
	testutil.StructsEqual(published, got).Compare(t, "published document doesn't match")

	testutil.ProtoEqual(t, published, got, "published document doesn't match")

	// Must show up in the list.
	{
		list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
		require.NoError(t, err)
		require.Len(t, list.Publications, 1, "must have 1 publication")
		published.Document.Children = nil
		published.Document.Version = ""
		published.Version = ""
		testutil.ProtoEqual(t, published, list.Publications[0], "publication in the list must match")
	}
}

func TestMerge(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Fisrt Doc"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world 1!",
		}}},
	})
	require.NoError(t, err)
	pub1, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{
		DocumentId: updated.Id,
	})
	require.NoError(t, err)

	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub1.Document.Id})
	require.NoError(t, err)
	updated2 := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Second Doc"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world 2!",
		}}},
	})
	require.NoError(t, err)
	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{
		DocumentId: updated2.Id,
	})
	require.NoError(t, err)
	require.Equal(t, pub1.Document.Id, pub2.Document.Id)

	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub1.Document.Id})
	require.NoError(t, err)
	updated3 := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Linked with the first"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Some content",
		}}},
	})
	require.NoError(t, err)
	pub3, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{
		DocumentId: updated3.Id,
	})
	require.NoError(t, err)
	require.Equal(t, pub1.Document.Id, pub3.Document.Id)
	_, err = api.MergeChanges(ctx, &documents.MergeChangesRequest{
		Id:       pub1.Document.Id,
		Versions: []string{pub1.Version, pub3.Version},
	})
	require.Error(t, err)
}

func TestRebase(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Fisrt Doc"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world 1!",
		}}},
	})
	require.NoError(t, err)
	pub1, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{
		DocumentId: updated.Id,
	})
	require.NoError(t, err)

	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub1.Document.Id})
	require.NoError(t, err)
	updated2 := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Second Doc"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world 2!",
		}}},
	})
	require.NoError(t, err)
	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{
		DocumentId: updated2.Id,
	})
	require.NoError(t, err)
	require.Equal(t, pub1.Document.Id, pub2.Document.Id)

	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub1.Document.Id})
	require.NoError(t, err)
	updated3 := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Linked with the first"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Some content",
		}}},
	})
	require.NoError(t, err)

	doc, err := api.RebaseChanges(ctx, &documents.RebaseChangesRequest{
		BaseDraftId: updated3.Id,
		Versions:    []string{pub1.Version, pub2.Version},
	})
	require.NoError(t, err)
	require.Equal(t, updated3.Id, doc.Id)
}

func TestAPIUpdateDraft_WithList(t *testing.T) {
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

	want := &documents.Document{
		Id:      draft.Id,
		Title:   "My new document title",
		Author:  draft.Author,
		Editors: []string{draft.Author},
		Children: []*documents.BlockNode{
			{
				Block: &documents.Block{
					Id:          "b1",
					Type:        "statement",
					Text:        "Hello world!",
					Attributes:  nil,
					Annotations: nil,
					Revision:    updated.Children[0].Block.Revision,
				},
				Children: nil,
			},
		},
		CreateTime:  draft.CreateTime,
		UpdateTime:  updated.UpdateTime,
		PublishTime: nil,
		Version:     updated.Version,
	}

	testutil.StructsEqual(want, updated).Compare(t, "updated draft doesn't match")

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Documents, 1)
	require.Equal(t, updated.Id, list.Documents[0].Id)
	require.Equal(t, updated.Author, list.Documents[0].Author)
	require.Equal(t, updated.Title, list.Documents[0].Title)

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	testutil.ProtoEqual(t, updated, got, "must get draft that was updated")
}

func TestAPIDeleteDraft(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	d1, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	d2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	deleted, err := api.DeleteDraft(ctx, &documents.DeleteDraftRequest{DocumentId: d1.Id})
	require.NoError(t, err)
	require.NotNil(t, deleted)

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Documents, 1) // Must be 1 because we've created another document apart from the deleted one.
	d2.Version = ""
	testutil.ProtoEqual(t, d2, list.Documents[0], "second document must be the only thing in the list")
}

func TestAPIDeleteDraft_WithPublishedChanges(t *testing.T) {
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

	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: updated.Id})
	require.NoError(t, err)

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub.Document.Id})
	require.NoError(t, err)

	_, err = api.DeleteDraft(ctx, &documents.DeleteDraftRequest{DocumentId: draft2.Id})
	require.NoError(t, err)

	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)

	require.Len(t, list.Publications, 1, "must have previous publication")
}

func TestCreateDraftFromPublication(t *testing.T) {
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
	require.NoError(t, err)
	require.NotNil(t, draft)
	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.NotNil(t, published)

	if diff := cmp.Diff(draft, published.Document, testutil.ExportedFieldsFilter(), cmpopts.IgnoreFields(documents.Document{}, "PublishTime")); diff != "" {
		t.Log(diff)
		t.Fatal("published doc must match its final draft")
	}

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{
		ExistingDocumentId: published.Document.Id,
	})
	require.NoError(t, err)

	require.True(t, draft2.UpdateTime.AsTime().After(published.Document.UpdateTime.AsTime()), "draft update time must be greater than previous publication")

	draft2 = updateDraft(ctx, t, api, draft2.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_DeleteBlock{DeleteBlock: "b1"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b2",
			Type: "statement",
			Text: "Hello updated!",
		}}},
	})

	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft2.Id})
	require.NoError(t, err)
	require.NotNil(t, pub2)

	drafts, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, drafts.Documents, 0)

	pubs, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, pubs.Publications, 1)

	pub2.Document.Children = nil

	testutil.StructsEqual(pub2, pubs.Publications[0]).
		IgnoreFields(documents.Document{}, "Version", "PreviousVersion"). // Listed pubs don't have those fields
		IgnoreFields(documents.Publication{}, "Version").
		Compare(t, "publication in the list must be the same as published")
}

func TestGetPublicationWithDraftID(t *testing.T) {
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

	published, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.Error(t, err, "draft must not be returned as publication")
	require.Nil(t, published, "draft is not a publication")
}

func TestPublisherAndEditors(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	_, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
		DocumentId: draft.Id,
		Changes: []*documents.DocumentChange{
			{Op: &documents.DocumentChange_SetTitle{SetTitle: "Document title"}},
		},
	})
	require.NoError(t, err)

	draft, err = api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.Equal(t, "Document title", draft.Title)
	wantEditors := []string{must.Do2(api.keys.GetKey(ctx, "main")).String()}
	require.Equal(t, wantEditors, draft.Editors)
}

func TestGetPreviousVersions(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	doc = updateDraft(ctx, t, api, doc.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}}},
	)

	pub1, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	doc, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub1.Document.Id})
	require.NoError(t, err)
	doc = updateDraft(ctx, t, api, doc.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "Changed document title"}},
	})

	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	require.False(t, proto.Equal(pub1, pub2), "changed publication must not be equal to the old one")

	// Get latest publication
	p, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, p, pub2, "latest publication must match")

	// Get latest by version
	p, err = api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id, Version: pub2.Version})
	require.NoError(t, err)
	testutil.ProtoEqual(t, p, pub2, "latest publication must match getting by version string")

	// Get older version
	p, err = api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id, Version: pub1.Version})
	require.NoError(t, err)
	testutil.ProtoEqual(t, p, pub1, "latest publication must match getting by version string")
}

func updateDraft(ctx context.Context, t *testing.T, api *Server, id string, updates []*documents.DocumentChange) *documents.Document {
	_, err := api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
		DocumentId: id,
		Changes:    updates,
	})
	require.NoError(t, err, "failed to update draft")

	draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: id})
	require.NoError(t, err, "failed to get draft after update")

	return draft
}

func newTestDocsAPI(t *testing.T, name string) *Server {
	u := coretest.NewTester("alice")

	db := storage.MakeTestDB(t)
	ks := core.NewMemoryKeyStore()
	require.NoError(t, ks.StoreKey(context.Background(), "main", u.Account))

	srv := NewServer(ks, db, nil, nil, "debug")
	bs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	_, err := daemon.Register(context.Background(), bs, u.Account, u.Account.PublicKey, time.Now())
	require.NoError(t, err)

	return srv
}
