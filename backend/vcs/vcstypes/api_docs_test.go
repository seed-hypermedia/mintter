package vcstypes

import (
	"context"
	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"path/filepath"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	multihash "github.com/multiformats/go-multihash/core"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func TestAPICreateDraft(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotEqual(t, "", doc.Id)
	c, err := cid.Decode(doc.Id)
	require.Equal(t, int(cid.DagCBOR), int(c.Prefix().Codec))
	require.NoError(t, err)
	require.Equal(t, api.me.AccountID().String(), doc.Author)
	require.False(t, doc.UpdateTime.AsTime().IsZero())
	require.False(t, doc.CreateTime.AsTime().IsZero())
}

func TestAPIGetDraft(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
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

func TestAPIUpdateDraft(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
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

	wc, err := api.vcs.LoadWorkingCopy(ctx, must.Two(cid.Decode(draft.Id)), "main")
	require.NoError(t, err)
	require.NotNil(t, wc.Data())

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

func TestAPIUpdateDraft_Complex(t *testing.T) {
	api := newTestDocsAPI(t, "alice")
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

func TestAPIPublishDraft(t *testing.T) {
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
	require.NotEqual(t, "", published.LatestVersion, "publication must have latest version")
	require.Equal(t, draft.Id, published.Document.Id)
	require.Equal(t, published.Version, published.LatestVersion, "published version must be the last one")

	docid, err := cid.Decode(published.Document.Id)
	require.NoError(t, err)

	version, err := api.vcs.LoadNamedVersion(ctx, docid, api.me.AccountID(), api.me.DeviceKey().CID(), "main")
	require.NoError(t, err)

	require.Equal(t, published.Version, version.String(), "published version must match the database")
	require.Len(t, version.CIDs(), 1, "published version must have one CID")
	require.Equal(t, published.LatestVersion, version.String(), "published latest version must match the database")

	require.True(t, start.Before(published.Document.CreateTime.AsTime()), "create time must be after test start")
	require.True(t, start.Before(published.Document.UpdateTime.AsTime()), "update time must be after test start")
	require.True(t, start.Before(published.Document.PublishTime.AsTime()), "publish time must be after test start")

	// list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	// require.NoError(t, err)
	// require.Len(t, list.Documents, 0, "published draft must be removed from drafts")

	// Draft must be removed after publishing.
	{
		draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{
			DocumentId: draft.Id,
		})
		require.Nil(t, draft, "draft must be removed after publishing")
		require.Error(t, err, "must fail to get published draft")
	}

	// Must get publication after publishing.
	got, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.NoError(t, err, "must get document after publishing")
	testutil.ProtoEqual(t, published, got, "published document doesn't match")
}

func TestDocumentToProto(t *testing.T) {
	docid := ipfs.MustNewCID(cid.Raw, multihash.IDENTITY, []byte("doc-id"))
	author := ipfs.MustNewCID(cid.Raw, multihash.IDENTITY, []byte("doc-author"))

	doc := NewDocument(docid, author, time.Now().UTC().Round(time.Second))

	doc.ChangeTitle("My new document title")
	doc.ChangeSubtitle("This is my document's abstract")
	require.NoError(t, doc.MoveBlock("b1", "", ""))
	require.NoError(t, doc.ReplaceBlock(Block{
		ID:   "b1",
		Type: "statement",
		Text: "Hello world",
	}))

	want := &documents.Document{
		Id:       docid.String(),
		Title:    "My new document title",
		Subtitle: "This is my document's abstract",
		Author:   author.String(),
		Children: []*documents.BlockNode{
			{
				Block: &documents.Block{
					Id:          "b1",
					Type:        "statement",
					Text:        "Hello world",
					Attributes:  map[string]string{},
					Annotations: nil,
				},
				Children: nil,
			},
		},
		CreateTime: timestamppb.New(doc.state.CreateTime),
		UpdateTime: timestamppb.New(doc.state.CreateTime),
	}

	docpb, err := docToProto(doc)
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, docpb, "must convert document to proto")
}

func updateDraft(ctx context.Context, t *testing.T, api *DocsAPI, id string, updates []*documents.DocumentChange) *documents.Document {
	_, err := api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
		DocumentId: id,
		Changes:    updates,
	})
	require.NoError(t, err)

	draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: id})
	require.NoError(t, err)

	return draft
}

func newTestDocsAPI(t *testing.T, name string) *DocsAPI {
	u := coretest.NewTester("alice")

	db := newTestSQLite(t)
	v := vcs.New(db)

	return NewDocsAPI(u.Identity, db, v)
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
