package backend

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"

	documents "mintter/api/go/documents/v1alpha"
	"mintter/backend/testutil"
)

func TestAPICreateDraft(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	api := newDraftsAPI(back)
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
	api := newDraftsAPI(back)
	ctx := context.Background()

	var docs [5]*documents.Document

	g, ctx := errgroup.WithContext(ctx)
	for i := range docs {
		i := i
		g.Go(func() error {
			doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
			if err != nil {
				return err
			}
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
