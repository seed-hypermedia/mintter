package documents

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"
	"mintter/backend/syncing"
	"mintter/backend/testutil"
	"mintter/backend/vcs/mttacc"
	"mintter/backend/vcs/vcsdb"
	"path/filepath"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

func TestCreateDraftFromPublication(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
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

	draft2, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{
		ExistingDocumentId: published.Document.Id,
	})
	require.NoError(t, err)
	draft2.PublishTime = published.Document.PublishTime
	testutil.ProtoEqual(t, published.Document, draft2, "draft from publication must be same as published")
	updated = updateDraft(ctx, t, api, draft2.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_DeleteBlock{DeleteBlock: "b1"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b2",
			Type: "statement",
			Text: "Hello updated!",
		}}},
	})

	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: updated.Id})
	require.NoError(t, err)
	require.NotNil(t, pub2)

	drafts, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, drafts.Documents, 0)

	pubs, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, pubs.Publications, 1)
	testutil.ProtoEqual(t, pub2, pubs.Publications[0], "publication in the list must be the same as published")
}

func TestBug_MissingLinkTarget(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
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

	linked, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: "bafy2bzaceaemtzyq7gj6fa5jn4xhfq6yp657j5dpoqvh6bio4kk4bi2wmoroy", LocalOnly: true})
	require.Error(t, err)
	require.Nil(t, linked)
}

func TestBug_BrokenPublicationList(t *testing.T) {
	// See: https://www.notion.so/mintter/Fix-List-of-Publications-Breaks-c5f37e237cca4618bd3296d926958cd6.
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
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

func TestAPICreateDraft(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotEqual(t, "", doc.Id)
	c, err := cid.Decode(doc.Id)
	require.Equal(t, int(cid.DagCBOR), int(c.Prefix().Codec))
	require.NoError(t, err)
	require.Equal(t, api.me.MustGet().AccountID().String(), doc.Author)
	require.False(t, doc.UpdateTime.AsTime().IsZero())
	require.False(t, doc.CreateTime.AsTime().IsZero())
}

func TestAPIGetDraft(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updated, got, "must get draft that was updated")
}

func TestUpdateDraftSmoke(t *testing.T) {
	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	resp, err := api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
		DocumentId: draft.Id,
		Changes: []*documents.DocumentChange{
			{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
			{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
			{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
			{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
				Id:   "b1",
				Type: "statement",
				Text: "Hello world!",
			}}},
			{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b2"}}},
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

func TestAPIUpdateDraft(t *testing.T) {
	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})

	want := &documents.Document{
		Id:       draft.Id,
		Title:    "My new document title",
		Subtitle: "This is my document's abstract",
		Author:   draft.Author,
		Children: []*documents.BlockNode{
			{
				Block: &documents.Block{
					Id:          "b1",
					Type:        "statement",
					Text:        "Hello world!",
					Attributes:  map[string]string{},
					Annotations: nil,
				},
				Children: nil,
			},
		},
		CreateTime:  draft.CreateTime,
		UpdateTime:  updated.UpdateTime,
		PublishTime: nil,
	}

	testutil.ProtoEqual(t, want, updated, "UpdateDraft should return the updated document")

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

func TestUpdateDraft_Annotations(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{
			SetTitle: "Hello Drafts V2",
		}},
		{Op: &documents.DocumentChange_SetSubtitle{
			SetSubtitle: "This is a more granular drafts API",
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
				Id:   "b1",
				Type: "statement",
				Text: "This is the first paragraph.",
				Attributes: map[string]string{
					"childrenListStyle": "bullet",
				},
				Annotations: []*documents.Annotation{
					{
						Type: "link",
						Attributes: map[string]string{
							"url": "https://exmaple.com",
						},
						Starts: []int32{0},
						Ends:   []int32{5},
					},
				},
			},
		}},
	})

	want := []*documents.BlockNode{
		{
			Block: &documents.Block{
				Id:   "b1",
				Type: "statement",
				Text: "This is the first paragraph.",
				Attributes: map[string]string{
					"childrenListStyle": "bullet",
				},
				Annotations: []*documents.Annotation{
					{
						Type: "link",
						Attributes: map[string]string{
							"url": "https://exmaple.com",
						},
						Starts: []int32{
							0,
						},
						Ends: []int32{
							5,
						},
					},
				},
			},
			Children: nil,
		},
	}

	require.Len(t, updated.Children, 1)
	testutil.ProtoEqual(t, want[0], updated.Children[0], "updated draft does't match")
}

func TestAPIUpdateDraft_Complex(t *testing.T) {
	t.Parallel()

	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	// === Add some content to the draft ===
	{
		_, err = api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_SetTitle{
					SetTitle: "Hello Drafts V2",
				}},
				{Op: &documents.DocumentChange_SetSubtitle{
					SetSubtitle: "This is a more granular drafts API",
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
						Id:   "b1",
						Text: "This is the first paragraph.",
					},
				}},
				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "b1.1",
						Parent:      "b1",
						LeftSibling: "",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:   "b1.1",
						Text: "This is a child of the first paragraph.",
					},
				}},

				{Op: &documents.DocumentChange_MoveBlock_{
					MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "b2",
						Parent:      "",
						LeftSibling: "",
					},
				}},
				{Op: &documents.DocumentChange_ReplaceBlock{
					ReplaceBlock: &documents.Block{
						Id:   "b2",
						Text: "This is inserted before the first paragraph.",
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
			Title:      "Hello Drafts V2",
			Subtitle:   "This is a more granular drafts API",
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
		}

		testutil.ProtoEqual(t, want, doc, "draft doesn't match after the first update")
	}

	// === Now reparent b1.1 ===
	{
		_, err = api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
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
			Title:      "Hello Drafts V2",
			Subtitle:   "This is a more granular drafts API",
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
		}

		testutil.ProtoEqual(t, want, doc, "draft doesn't match after the first update")
	}

	// === Now delete b1.1 ===
	{
		_, err = api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
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
			Title:      "Hello Drafts V2",
			Subtitle:   "This is a more granular drafts API",
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
		}

		testutil.ProtoEqual(t, want, doc, "draft doesn't match after the first update")
	}
}

func TestAPIDeleteDraft(t *testing.T) {
	api := newTestDocsAPI(t, "alice", "")
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
	testutil.ProtoEqual(t, d2, list.Documents[0], "second document must be the only thing in the list")
}

func TestAPIPublishDraft(t *testing.T) {
	t.Parallel()

	// We'll measure that dates on the published document are greater than start date.
	// Since the test runs fast we reverse the start time a bit to notice the difference.
	start := time.Now().Add(time.Minute * -1).UTC().Round(time.Second)

	// Move clock back a bit so that timestamps generated in tests
	// are clearly after the test start.
	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, api, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})

	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	updated.UpdateTime = published.Document.UpdateTime
	updated.PublishTime = published.Document.PublishTime // This is the only field that should differ.
	testutil.ProtoEqual(t, updated, published.Document, "published document doesn't match")

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

	// Must get publication after publishing.
	got, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id, LocalOnly: true})
	require.NoError(t, err, "must get document after publishing")
	testutil.ProtoEqual(t, published, got, "published document doesn't match")
}

func TestAPIGetRemotePublication(t *testing.T) {
	t.Parallel()

	// We'll measure that dates on the published document are greater than start date.
	// Since the test runs fast we reverse the start time a bit to notice the difference.
	start := time.Now().Add(time.Minute * -1).UTC().Round(time.Second)

	ctx := context.Background()
	// Carol will be the DHT server
	carol := newTestDocsAPI(t, "carol", "")
	carolAddrInfo, err := carol.provider.AddrInfo()
	require.NoError(t, err)
	carolAddrs := carolAddrInfo.Addrs[0].String()
	carolID := carolAddrInfo.ID.String()
	alice := newTestDocsAPI(t, "alice", carolAddrs+"/p2p/"+carolID)
	bob := newTestDocsAPI(t, "bob", carolAddrs+"/p2p/"+carolID)

	draft, err := alice.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	updated := updateDraft(ctx, t, alice, draft.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
		{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: "This is my document's abstract"}},
		{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
		{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
			Id:   "b1",
			Type: "statement",
			Text: "Hello world!",
		}}},
	})

	published, err := alice.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	updated.UpdateTime = published.Document.UpdateTime
	updated.PublishTime = published.Document.PublishTime // This is the only field that should differ.
	testutil.ProtoEqual(t, updated, published.Document, "published document doesn't match")

	require.NotEqual(t, "", published.Document.Id, "publication must have id")
	require.NotEqual(t, "", published.Version, "publication must have version")
	require.Equal(t, draft.Id, published.Document.Id)

	require.True(t, start.Before(published.Document.CreateTime.AsTime()), "create time must be after test start")
	require.True(t, start.Before(published.Document.UpdateTime.AsTime()), "update time must be after test start")
	require.True(t, start.Before(published.Document.PublishTime.AsTime()), "publish time must be after test start")
	cID := cid.Cid{}
	require.NoError(t, cID.UnmarshalText([]byte(draft.Id)))

	// To make sure bob is not directly connected to alice since they are bootstrapped to the same node
	aliceAI, err := alice.provider.AddrInfo()
	require.NoError(t, err)
	err = bob.provider.ClosePeer(aliceAI.ID)
	require.NoError(t, err)

	remotePublication, err := bob.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: cID.String()})
	require.NoError(t, err)
	testutil.ProtoEqual(t, published, remotePublication, "remote publication doesn't match")

}

func TestAPIDeletePublication(t *testing.T) {
	api := newTestDocsAPI(t, "alice", "")
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	doc = updateDraft(ctx, t, api, doc.Id, []*documents.DocumentChange{
		{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}}},
	)

	_, err = api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1)

	deleted, err := api.DeletePublication(ctx, &documents.DeletePublicationRequest{DocumentId: doc.Id})
	require.NoError(t, err)
	require.NotNil(t, deleted)

	list, err = api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0)

	pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id, LocalOnly: true})
	require.Error(t, err, "must fail to get deleted publication")
	_ = pub

	// TODO: fix status codes.
	// s, ok := status.FromError(err)
	// require.True(t, ok)
	// require.Nil(t, pub)
	// require.Equal(t, codes.NotFound, s.Code())
}

func TestGetPreviousVersions(t *testing.T) {
	api := newTestDocsAPI(t, "alice", "")
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
	_, err := api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
		DocumentId: id,
		Changes:    updates,
	})
	require.NoError(t, err)

	draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: id})
	require.NoError(t, err)

	return draft
}

func newTestDocsAPI(t *testing.T, name string, bootstrapPeer string) *Server {
	u := coretest.NewTester(name)

	db := newTestSQLite(t)

	fut := future.New[core.Identity]()
	require.NoError(t, fut.Resolve(u.Identity))

	mttFut := future.New[*mttnet.Node]()

	hvcs := vcsdb.New(db)

	conn, release, err := hvcs.Conn(context.Background())
	require.NoError(t, err)
	reg, err := mttacc.Register(context.Background(), u.Account, u.Device, conn)
	release()
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.ReportPrivateAddrs = true
	cfg.NoRelay = true
	cfg.NoBootstrap = bootstrapPeer == ""
	cfg.BootstrapPeer = bootstrapPeer
	cfg.NoMetrics = true

	n, err := mttnet.New(cfg, hvcs, reg, u.Identity, must.Do2(zap.NewDevelopment()).Named(name))
	require.NoError(t, err)
	require.NoError(t, mttFut.Resolve(n))

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		errc <- n.Start(ctx)
	}()

	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-errc)
	})

	select {
	case <-n.Ready():
	case err := <-errc:
		require.NoError(t, err)
	}

	syncService := syncing.NewService(must.Do2(zap.NewDevelopment()).Named(name), n.ID(), n.VCS().DB(), n.VCS(), n.Bitswap().NewSession, n.Client)

	srv := NewServer(fut.ReadOnly, db, NewProvider(mttFut.ReadOnly, syncService.SyncWithPeer))

	return srv
}

func newTestSQLite(t *testing.T) *sqlitex.Pool {
	path := testutil.MakeRepoPath(t)

	pool, err := sqliteschema.Open(filepath.Join(path, "db.sqlite"), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	require.NoError(t, sqliteschema.Migrate(conn))

	return pool
}
