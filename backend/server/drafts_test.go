package server_test

import (
	"context"
	pb "mintter/proto"
	"testing"

	"github.com/golang/protobuf/proto"
	"github.com/stretchr/testify/require"
)

func TestCreateDraft(t *testing.T) {
	srv := newSeededServer(t)
	t.Cleanup(func() {
		require.NoError(t, srv.Close())
	})
	ctx := context.Background()

	resp, err := srv.CreateDraft(ctx, &pb.CreateDraftRequest{})
	require.NoError(t, err)

	require.NotEqual(t, "", resp.DocumentId)
	require.NotEqual(t, "", resp.Author)
	require.Empty(t, resp.Sections)
	require.NotNil(t, resp.CreateTime)
	require.NotNil(t, resp.UpdateTime)
}

func TestSaveDraft(t *testing.T) {
	srv := newSeededServer(t)
	t.Cleanup(func() {
		require.NoError(t, srv.Close())
	})
	ctx := context.Background()

	_, err := srv.SaveDraft(ctx, &pb.Draft{
		DocumentId: "fake id",
	})
	require.Error(t, err)

	draft, err := srv.CreateDraft(ctx, &pb.CreateDraftRequest{})
	require.NoError(t, err)

	draft.Title = "My first document"
	draft.Description = "This is a description"
	draft.Sections = append(draft.Sections, &pb.Section{
		Body: "Hello world",
	})

	stored, err := srv.SaveDraft(ctx, draft)
	require.NoError(t, err)
	require.NotEqual(t, draft.UpdateTime, stored.UpdateTime)
	require.Equal(t, draft.Title, stored.Title)
	require.Equal(t, draft.Description, stored.Description)
	require.Equal(t, "Hello world", stored.Sections[0].Body)

	got, err := srv.GetDraft(ctx, &pb.GetDraftRequest{DocumentId: draft.DocumentId})
	require.NoError(t, err)
	require.True(t, proto.Equal(got, stored), "stored and got drafts must be the same")
}

func TestListDrafts(t *testing.T) {
	srv := newSeededServer(t)
	t.Cleanup(func() {
		require.NoError(t, srv.Close())
	})
	ctx := context.Background()

	d1, err := srv.CreateDraft(ctx, &pb.CreateDraftRequest{})
	require.NoError(t, err)

	d2, err := srv.CreateDraft(ctx, &pb.CreateDraftRequest{})
	require.NoError(t, err)

	d1.Title = "Doc 1"
	d2.Title = "Doc 2"

	d1, err = srv.SaveDraft(ctx, d1)
	require.NoError(t, err)

	d2, err = srv.SaveDraft(ctx, d2)
	require.NoError(t, err)

	resp, err := srv.ListDrafts(ctx, &pb.ListDraftsRequest{})
	require.NoError(t, err)

	titles := []string{resp.Drafts[0].Title, resp.Drafts[1].Title}
	require.ElementsMatch(t, []string{d1.Title, d2.Title}, titles)
}

func TestPublishDraft(t *testing.T) {
	srv := newSeededServer(t)
	t.Cleanup(func() {
		require.NoError(t, srv.Close())
	})
	ctx := context.Background()

	draft, err := srv.CreateDraft(ctx, &pb.CreateDraftRequest{})
	require.NoError(t, err)

	draft.Title = "My crazy new document"
	draft.Sections = append(draft.Sections, &pb.Section{
		Body: "Hello world",
	})

	draft, err = srv.SaveDraft(ctx, draft)
	require.NoError(t, err)

	pub, err := srv.PublishDraft(ctx, &pb.PublishDraftRequest{
		DocumentId: draft.DocumentId,
	})
	require.NoError(t, err)

	sec, err := srv.GetSection(ctx, &pb.GetSectionRequest{
		SectionId: pub.Sections[0],
	})
	require.NoError(t, err)

	require.Equal(t, "Hello world", sec.Body)
}
