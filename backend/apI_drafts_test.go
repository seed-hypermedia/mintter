package backend

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	documents "mintter/api/go/documents/v1alpha"
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
