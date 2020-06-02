package server_test

import (
	"context"
	"testing"

	pb "mintter/proto"

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

	// Draft must be deleted after publication.
	resp, err := srv.GetDraft(ctx, &pb.GetDraftRequest{DocumentId: draft.DocumentId})
	require.Error(t, err)
	require.Nil(t, resp)
}

func TestListPublications(t *testing.T) {
	srv := newSeededServer(t)
	t.Cleanup(func() {
		require.NoError(t, srv.Close())
	})
	ctx := context.Background()

	var pubs []*pb.Publication

	{
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

		pubs = append(pubs, pub)
	}
	{
		draft, err := srv.CreateDraft(ctx, &pb.CreateDraftRequest{})
		require.NoError(t, err)

		draft.Title = "Document 2"
		draft.Sections = append(draft.Sections, &pb.Section{
			Body: "Hello world 2",
		})

		draft, err = srv.SaveDraft(ctx, draft)
		require.NoError(t, err)

		pub, err := srv.PublishDraft(ctx, &pb.PublishDraftRequest{
			DocumentId: draft.DocumentId,
		})
		require.NoError(t, err)

		pubs = append(pubs, pub)
	}

	resp, err := srv.ListPublications(ctx, &pb.ListPublicationsRequest{})
	require.NoError(t, err)

	require.ElementsMatch(t, pubs, resp.Publications)
}

func TestGetPublication_Remote(t *testing.T) {
	ctx := context.Background()

	alice := newSeededServer(t, testMnemonic...)
	bob := newSeededServer(t, testMnemonic2...)

	t.Cleanup(func() {
		require.NoError(t, alice.Close())
		require.NoError(t, bob.Close())
	})

	var publication *pb.Publication
	{
		draft, err := alice.CreateDraft(ctx, &pb.CreateDraftRequest{})
		require.NoError(t, err)

		draft.Title = "My crazy new document"
		draft.Sections = append(draft.Sections, &pb.Section{
			Body: "Hello world",
		})

		draft, err = alice.SaveDraft(ctx, draft)
		require.NoError(t, err)

		pub, err := alice.PublishDraft(ctx, &pb.PublishDraftRequest{
			DocumentId: draft.DocumentId,
		})
		require.NoError(t, err)

		publication = pub
	}

	connectPeers(t, ctx, alice, bob)

	list, err := bob.ListPublications(ctx, &pb.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Empty(t, list.Publications, "bob must have no publications initially")

	gotPub, err := bob.GetPublication(ctx, &pb.GetPublicationRequest{
		PublicationId: publication.Id,
	})
	require.NoError(t, err)
	require.True(t, proto.Equal(publication, gotPub), "bob must fetch publication via alice")

	secResp, err := bob.BatchGetSections(ctx, &pb.BatchGetSectionsRequest{
		SectionIds: gotPub.Sections,
	})
	require.NoError(t, err)
	require.Equal(t, len(gotPub.Sections), len(secResp.Sections))

	list, err = bob.ListPublications(ctx, &pb.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1, "bob must now have alice's publication locally")
}
