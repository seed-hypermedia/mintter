package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
)

func TestBug_CorruptedDraftWithMultipleNestedMoves(t *testing.T) {
	// t.Skip("TODO(burdiyan): fix this test after implementing state-based update API")

	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	// Initial state. 3 blocks, one after the other.
	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{Id: "b1", Type: "paragraph", Text: "Block 1"}}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2", LeftSibling: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{Id: "b2", Type: "paragraph", Text: "Block 2"}}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b3", LeftSibling: "b2"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{Id: "b3", Type: "paragraph", Text: "Block 3"}}},
	})

	// Commit the current state.
	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub.Document.Id})
	require.NoError(t, err)

	// Indent the last two blocks.
	updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2", Parent: "b1"}}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b3", Parent: "b1", LeftSibling: "b2"}}},
	})

	// Unindent the last two blocks.
	updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2", Parent: "", LeftSibling: "b1"}}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b3", Parent: "", LeftSibling: "b2"}}},
	})

	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.Equal(t, pub.Version, pub2.Version, "ineffectual publish must return previous version")
}

func TestBug_UnchangedPublish(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{Id: "b1", Type: "paragraph", Text: "Hello world!"}}},
	})

	pub1, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: draft.Id})
	require.NoError(t, err)

	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft2.Id})
	require.NoError(t, err)

	require.Equal(t, pub1.Version, pub2.Version, "unchanged draft should return the previous version when published")
}

func TestBug_UndeletableBlock(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	draft = updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{Id: "b1", Type: "paragraph", Text: "Hello world!"}}},
	})

	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{ExistingDocumentId: pub.Document.Id})
	require.NoError(t, err)

	draft2 = updateDraft(ctx, t, api, draft2.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_DeleteBlock{DeleteBlock: "b1"}},
	})

	require.Len(t, draft2.Children, 0, "must have no children")
}

func TestBug_DraftsInTrustedPublicationList(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
	})
	require.NoError(t, err)
	require.NotNil(t, updated)

	pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.Error(t, err, "must fail asking for doc ID that only has a draft")
	require.Nil(t, pub)

	pubs, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{TrustedOnly: false})
	require.NoError(t, err)
	require.Len(t, pubs.Publications, 0, "must have no publications")

	pubs, err = api.ListPublications(ctx, &documents.ListPublicationsRequest{TrustedOnly: true})
	require.NoError(t, err)
	require.Len(t, pubs.Publications, 0, "must have no publications in trusted list")
}

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

	calls := []*documents.UpdateDraftRequest{
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
		_, err = api.UpdateDraft(ctx, call)
		require.NoError(t, err, "failed call %d", i)
	}
}

func TestBug_FailToUpdatePublication(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	log := [][2]string{
		{"CreateDraft", `{}`},
		{"UpdateDraft", `{"documentId":"Igyet4ZbVaawKw4ucLuAgh","changes":[{"moveBlock":{"blockId":"gSB6m9UT"}},{"replaceBlock":{"id":"gSB6m9UT","type":"statement","text":"This is hello world!"}},{"replaceBlock":{"id":"gSB6m9UT","type":"statement","text":"This is hello world!"}},{"setTitle":"This is hello world!"}]}`},
		{"PublishDraft", `{"documentId":"Igyet4ZbVaawKw4ucLuAgh"}`},
		{"CreateDraft", `{"existingDocumentId":"Igyet4ZbVaawKw4ucLuAgh"}`},
		{"UpdateDraft", `{"documentId":"Igyet4ZbVaawKw4ucLuAgh","changes":[{"replaceBlock":{"id":"gSB6m9UT","type":"statement","text":"This is hello world!","revision":"bafy2bzacecxc5joirohqlchyk5u4y6we433ifnxyn74xpmsxyfleoonnbl432"}},{"moveBlock":{"blockId":"gSB6m9UT"}},{"replaceBlock":{"id":"gSB6m9UT","type":"statement","text":"This is hello world!","revision":"bafy2bzacecxc5joirohqlchyk5u4y6we433ifnxyn74xpmsxyfleoonnbl432"}},{"moveBlock":{"blockId":"uMtOJmx_","leftSibling":"gSB6m9UT"}},{"replaceBlock":{"id":"uMtOJmx_","type":"statement"}},{"moveBlock":{"blockId":"uMtOJmx_","leftSibling":"gSB6m9UT"}},{"replaceBlock":{"id":"uMtOJmx_","type":"statement"}},{"setTitle":"This is hello world!"}]}`},
		{"UpdateDraft", `{"documentId":"Igyet4ZbVaawKw4ucLuAgh","changes":[{"replaceBlock":{"id":"gSB6m9UT","type":"statement","text":"This is hello world!","revision":"bafy2bzacecxc5joirohqlchyk5u4y6we433ifnxyn74xpmsxyfleoonnbl432"}},{"moveBlock":{"blockId":"gSB6m9UT"}},{"replaceBlock":{"id":"gSB6m9UT","type":"statement","text":"This is hello world!","revision":"bafy2bzacecxc5joirohqlchyk5u4y6we433ifnxyn74xpmsxyfleoonnbl432"}},{"moveBlock":{"blockId":"uMtOJmx_","leftSibling":"gSB6m9UT"}},{"replaceBlock":{"id":"uMtOJmx_","type":"statement","text":"Edited hello world!"}},{"moveBlock":{"blockId":"uMtOJmx_","leftSibling":"gSB6m9UT"}},{"replaceBlock":{"id":"uMtOJmx_","type":"statement","text":"Edited hello world!"}},{"setTitle":"This is hello world!"}]}`},
		{"GetDraft", `{"documentId":"Igyet4ZbVaawKw4ucLuAgh"}`},
		{"PublishDraft", `{"documentId":"Igyet4ZbVaawKw4ucLuAgh"}`},
	}

	var docid string
	for _, call := range log {
		method := call[0]

		switch method {
		case "CreateDraft":
			req := &documents.CreateDraftRequest{}
			require.NoError(t, protojson.Unmarshal([]byte(call[1]), req))
			if req.ExistingDocumentId != "" {
				if docid == "" {
					t.Fatal("must create draft before mutating publication")
				}
				req.ExistingDocumentId = docid
			}
			resp, err := api.CreateDraft(ctx, req)
			require.NoError(t, err)
			docid = resp.Id
		case "UpdateDraft":
			req := &documents.UpdateDraftRequest{}
			require.NoError(t, protojson.Unmarshal([]byte(call[1]), req))
			req.DocumentId = docid
			_, err := api.UpdateDraft(ctx, req)
			require.NoError(t, err)
		case "PublishDraft":
			req := &documents.PublishDraftRequest{}
			require.NoError(t, protojson.Unmarshal([]byte(call[1]), req))
			req.DocumentId = docid
			_, err := api.PublishDraft(ctx, req)
			require.NoError(t, err)
		case "GetDraft":
			req := &documents.GetDraftRequest{}
			require.NoError(t, protojson.Unmarshal([]byte(call[1]), req))
			req.DocumentId = docid
			_, err := api.GetDraft(ctx, req)
			require.NoError(t, err)
		default:
			panic("BUG: unhandled method " + method)
		}
	}
}

func TestBug_MissingPublicationListItemWithActiveDraft(t *testing.T) {
	// See: https://www.notion.so/mintter/When-I-edit-a-publication-it-becomes-a-draft-and-disappears-from-the-All-Documents-5997095f6e264b01830b0d78ae9bb6f0.
	// When a publication has an active draft it's now shown in the list of publications.

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

	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1)

	draft, err = api.CreateDraft(ctx, &documents.CreateDraftRequest{
		ExistingDocumentId: published.Document.Id,
	})
	require.NoError(t, err)
	require.NotNil(t, draft)

	pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.NotNil(t, pub)
	require.Equal(t, published.Version, pub.Version)

	list, err = api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1, "publication must be in the list even with an active draft")

	drafts, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, drafts.Documents, 1, "draft must be in the list")

	draft, err = api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.NotNil(t, draft)
}
