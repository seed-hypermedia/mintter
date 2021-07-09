package backend

import (
	"context"
	"strconv"
	"sync"
	"testing"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/testutil"
)

func TestAPICreateDraft(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	require.NotEqual(t, "", doc.Id)
	require.Equal(t, back.repo.acc.id.String(), doc.Author)
	require.False(t, doc.UpdateTime.AsTime().IsZero())
	require.False(t, doc.CreateTime.AsTime().IsZero())
	require.Nil(t, doc.PublishTime)
}

func TestAPIListDrafts(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	var docs [5]*documents.Document

	g, ctx := errgroup.WithContext(ctx)
	for i := range docs {
		i := i
		g.Go(func() error {
			ia := strconv.Itoa(i)
			doc := makeDraft(t, ctx, api, "My Document Title "+ia, "Subtitle "+ia)
			docs[i] = doc
			return nil
		})
	}
	require.NoError(t, g.Wait())

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)

	for _, doc := range list.Documents {
		var ok bool
		for _, d := range docs {
			if d.Id == doc.Id {
				ok = true
				testutil.ProtoEqual(t, d, doc, "documents don't match")
				break
			}
		}
		require.True(t, ok, "document was not found "+doc.Id)
	}
}

func TestAPIGetDraft(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	testutil.ProtoEqual(t, doc, got, "must get draft that was created")
}

func TestAPIUpdateDraft_BugDuplicatedBlocks(t *testing.T) {
	// See: https://www.notion.so/mintter/updateDraft-duplicating-blocks-e5611c8112a4487cac199ffd612244ee
	// for some history.

	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	doc.Children = []string{"block-1"}
	doc.Blocks = map[string]*documents.Block{
		"block-1": {
			Id: "block-1",
			Elements: []*documents.InlineElement{
				{
					Content: &documents.InlineElement_TextRun{
						TextRun: &documents.TextRun{
							Text: "Hello World",
						},
					},
				},
			},
		},
	}

	updated, err := api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: doc})
	require.NoError(t, err)
	doc.UpdateTime = updated.UpdateTime
	testutil.ProtoEqual(t, doc, updated, "updated doc don't match")

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updated, got, "got must be as updated")

	got.Children = []string{"block-1", "block-2"}
	got.Blocks["block-2"] = &documents.Block{
		Id: "block-2",
		Elements: []*documents.InlineElement{
			{
				Content: &documents.InlineElement_TextRun{
					TextRun: &documents.TextRun{
						Text: "Another Hello World",
					},
				},
			},
		},
	}

	updated, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: got})
	require.NoError(t, err)
	got.UpdateTime = updated.UpdateTime
	testutil.ProtoEqual(t, got, updated, "updated must match got")

	got, err = api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: updated.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updated, got, "got after update")
}

func TestAPISyncDocuments(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	aapi := newDocsAPI(alice)
	bob := makeTestBackend(t, "bob", true)
	bapi := newDocsAPI(bob)
	ctx := context.Background()

	draft := makeDraft(t, ctx, aapi, "Alice Docs", "Subtitle")
	_, err := aapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)

	connectPeers(t, ctx, alice, bob, true)

	list, err := bapi.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0)

	require.NoError(t, bob.SyncAccounts(ctx))

	pub, err := bapi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	draft.PublishTime = pub.Document.PublishTime // Draft doesn't have publish time.
	testutil.ProtoEqual(t, draft, pub.Document, "fetched draft must be equal")

	list, err = bapi.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1)

	// Try to sync again. Nothing new has to appear.

	require.NoError(t, bob.SyncAccounts(ctx))

	pub, err = bapi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	draft.PublishTime = pub.Document.PublishTime // Draft doesn't have publish time.
	testutil.ProtoEqual(t, draft, pub.Document, "fetched draft must be equal")

	list, err = bapi.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1)
}

func TestAPIUpdateDraft(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	doc.Title = "My new document title"
	doc.Subtitle = "This is my document's abstract"
	doc.Children = []string{"block-1"}
	doc.Blocks = map[string]*documents.Block{
		"block-1": {
			Id: "block-1",
			Elements: []*documents.InlineElement{
				{
					Content: &documents.InlineElement_TextRun{
						TextRun: &documents.TextRun{
							Text: "Hello world!",
						},
					},
				},
			},
		},
	}

	updated, err := api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: doc})
	require.NoError(t, err)

	doc.UpdateTime = updated.UpdateTime // This is the only field that should differ.
	testutil.ProtoEqual(t, doc, updated, "UpdateDraft should return the updated document")

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Documents, 1)
	require.Equal(t, updated.Id, list.Documents[0].Id)
	require.Equal(t, updated.Author, list.Documents[0].Author)
	require.Equal(t, updated.Title, list.Documents[0].Title)

	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	testutil.ProtoEqual(t, doc, got, "must get draft that was updated")
}

func TestAPIDeleteDraft(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc := makeDraft(t, ctx, api, "My Document 1", "Subtitle 1")
	doc2 := makeDraft(t, ctx, api, "My Document 2", "Subtitle 2")

	deleted, err := api.DeleteDraft(ctx, &documents.DeleteDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)
	require.NotNil(t, deleted)

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Documents, 1) // Must be 1 because we've created another document apart from the deleted one.
	testutil.ProtoEqual(t, doc2, list.Documents[0], "second document must be the only thing in the list")
}

func TestAPIPublishDraft(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc := makeDraft(t, ctx, api, "My Document Title", "Subtitle")

	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	docid, err := cid.Decode(doc.Id)
	require.NoError(t, err)

	version, err := back.patches.GetObjectVersion(ctx, docid)
	require.NoError(t, err)

	require.Equal(t, doc.Id, version.ObjectId)
	require.Len(t, version.VersionVector, 1)
	require.Equal(t, published.Version, version.VersionVector[0].Head)

	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Documents, 0, "published draft must be removed from drafts")

	pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id})
	require.NoError(t, err, "must get document after publishing")
	doc.PublishTime = pub.Document.PublishTime // This is the only field that should differ.
	testutil.ProtoEqual(t, doc, pub.Document, "published document doesn't match")
}

func TestListPublications(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0)

	var drafts [5]*documents.Document
	var publications [len(drafts)]*documents.PublishDraftResponse

	var wg sync.WaitGroup

	wg.Add(len(drafts))
	for i := range drafts {
		go func(i int) {
			ia := strconv.Itoa(i)
			drafts[i] = makeDraft(t, ctx, api, "My Document "+ia, "Subtitle "+ia)
			wg.Done()
		}(i)
	}

	wg.Wait()

	wg.Add(len(drafts))
	for i := range drafts {
		go func(i int) {
			d := drafts[i]
			pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: d.Id})
			require.NoError(t, err, "failed to publish document "+d.Title)
			publications[i] = pub
			wg.Done()
		}(i)
	}

	wg.Wait()

	list, err = api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, len(drafts))
	for _, l := range list.Publications {
		require.NotEqual(t, "", l.Document.Id)
		require.NotEqual(t, "", l.Document.Title)
		require.NotEqual(t, "", l.Document.Subtitle)
		require.NotNil(t, l.Document.CreateTime)
		require.NotNil(t, l.Document.UpdateTime)
		require.NotNil(t, l.Document.PublishTime)
	}
}

func TestAPIDeletePublication(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDocsAPI(back)
	ctx := context.Background()

	doc := makeDraft(t, ctx, api, "My Publication For Delete", "THIS WILL BE DELETED")
	_, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	deleted, err := api.DeletePublication(ctx, &documents.DeletePublicationRequest{DocumentId: doc.Id})
	require.NoError(t, err)
	require.NotNil(t, deleted)

	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0)

	pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id})
	s, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.NotFound, s.Code())
	require.Nil(t, pub)
}

func makeDraft(t *testing.T, ctx context.Context, api DocsServer, title, subtitle string) *documents.Document {
	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	doc.Title = title
	doc.Subtitle = subtitle

	doc, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: doc})
	require.NoError(t, err)

	return doc
}
