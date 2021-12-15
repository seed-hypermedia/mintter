package backend

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	documents "mintter/backend/api/documents/v1alpha"
)

// DocsServer combines Drafts and Publications servers.
type DocsServer interface {
	documents.DraftsServer
	documents.PublicationsServer
	documents.ContentGraphServer
}

type docsService interface {
	GetDraft(context.Context, cid.Cid) (Draft, error)
	Account() (PublicAccount, error)
	GetPermanode(context.Context, cid.Cid) (signedPermanode, error)
	SaveDraft(
		ctx context.Context,
		perma signedPermanode,
		title string,
		subtitle string,
		createTime time.Time,
		updateTime time.Time,
		content []byte,
	) (err error)
	NewDocumentPermanode() (signedPermanode, error)
	ListDrafts(context.Context) ([]draftsListResult, error)
	DeleteDraft(context.Context, cid.Cid) error
	PublishDraft(ctx context.Context, c cid.Cid) (Publication, error)
	LoadState(ctx context.Context, obj cid.Cid) (*changeset, error)
	ListPublications(ctx context.Context) ([]publicationsListResult, error)
	DeletePublication(ctx context.Context, c cid.Cid) (err error)
}

type docsAPI struct {
	// TODO: implement content graph.
	documents.UnimplementedContentGraphServer

	feedMu sync.Mutex
	back   docsService
}

func newDocsAPI(back *backend) DocsServer {
	return &docsAPI{
		back: back,
	}
}

func (srv *docsAPI) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	draft, err := srv.back.GetDraft(ctx, c)
	if err != nil {
		return nil, err
	}

	acc, err := srv.back.Account()
	if err != nil {
		return nil, err
	}

	doc := &documents.Document{
		Id:         in.DocumentId,
		Title:      draft.Title,
		Subtitle:   draft.Subtitle,
		Author:     acc.id.String(),
		Content:    string(draft.Content),
		CreateTime: timestamppb.New(draft.CreateTime),
		UpdateTime: timestamppb.New(draft.UpdateTime),
	}

	return doc, nil
}

func (srv *docsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	if in.ExistingDocumentId != "" {
		pub, err := srv.GetPublication(ctx, &documents.GetPublicationRequest{
			DocumentId: in.ExistingDocumentId,
		})
		if err != nil {
			return nil, err
		}

		acc, err := srv.back.Account()
		if err != nil {
			return nil, err
		}

		// TODO: remove this when we implement this properly.
		if pub.Document.Author != acc.id.String() {
			return nil, status.Error(codes.PermissionDenied, "can't update publications from other authors yet")
		}

		docid, err := srv.parseDocumentID(in.ExistingDocumentId)
		if err != nil {
			return nil, err
		}

		pub.Document.PublishTime = nil

		perma, err := srv.back.GetPermanode(ctx, docid)
		if err != nil {
			return nil, err
		}

		if err := srv.back.SaveDraft(
			ctx,
			perma,
			pub.Document.Title,
			pub.Document.Subtitle,
			pub.Document.CreateTime.AsTime(),
			pub.Document.UpdateTime.AsTime(),
			[]byte(pub.Document.Content),
		); err != nil {
			return nil, err
		}

		return pub.Document, nil
	}

	pn, err := srv.back.NewDocumentPermanode()
	if err != nil {
		return nil, fmt.Errorf("failed to create permanode: %v", err)
	}

	acc, err := srv.back.Account()
	if err != nil {
		return nil, err
	}

	doc := &documents.Document{
		Id:         pn.blk.Cid().String(),
		Author:     acc.id.String(),
		CreateTime: timestamppb.New(pn.perma.CreateTime),
		UpdateTime: timestamppb.New(pn.perma.CreateTime),
	}

	if err := srv.back.SaveDraft(
		ctx,
		pn,
		doc.Title,
		doc.Subtitle,
		doc.CreateTime.AsTime(),
		doc.UpdateTime.AsTime(),
		[]byte(doc.Content),
	); err != nil {
		return nil, err
	}

	return doc, nil
}

func (srv *docsAPI) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	list, err := srv.back.ListDrafts(ctx)
	if err != nil {
		return nil, err
	}

	out := &documents.ListDraftsResponse{
		Documents: make([]*documents.Document, len(list)),
	}

	acc, err := srv.back.Account()
	if err != nil {
		return nil, err
	}

	aid := acc.id.String()

	for i, l := range list {
		out.Documents[i] = &documents.Document{
			Id:         cid.NewCidV1(uint64(l.ObjectsCodec), l.ObjectsMultihash).String(),
			Author:     aid,
			Title:      l.DraftsTitle,
			Subtitle:   l.DraftsSubtitle,
			CreateTime: timestamppb.New(timeFromSeconds(l.DraftsCreateTime)),
			UpdateTime: timestamppb.New(timeFromSeconds(l.DraftsUpdateTime)),
		}
	}

	return out, nil
}

func (srv *docsAPI) UpdateDraft(ctx context.Context, in *documents.UpdateDraftRequest) (*documents.Document, error) {
	c, err := srv.parseDocumentID(in.Document.Id)
	if err != nil {
		return nil, err
	}

	perma, err := srv.back.GetPermanode(ctx, c)
	if err != nil {
		return nil, err
	}

	now := nowTruncated()

	if err := srv.back.SaveDraft(
		ctx,
		perma,
		in.Document.Title,
		in.Document.Subtitle,
		perma.perma.CreateTime,
		now,
		[]byte(in.Document.Content),
	); err != nil {
		return nil, err
	}

	in.Document.CreateTime = timestamppb.New(perma.perma.CreateTime)
	in.Document.UpdateTime = timestamppb.New(now)

	return in.Document, nil
}

func (srv *docsAPI) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, srv.back.DeleteDraft(ctx, c)
}

func (srv *docsAPI) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	// TODO: rethink so that this lock is not necessary.
	// For some stupid thing we can't publish drafts concurrently.
	// Remove this lock and see how the tests will fail. Not a biggie though.
	srv.feedMu.Lock()
	defer srv.feedMu.Unlock()

	pub, err := srv.back.PublishDraft(ctx, c)
	if err != nil {
		return nil, err
	}

	return pubToProto(in.DocumentId, pub), nil
}

func pubToProto(id string, pub Publication) *documents.Publication {
	return &documents.Publication{
		Document: &documents.Document{
			Id:          id,
			Title:       pub.Title,
			Subtitle:    pub.Subtitle,
			Author:      pub.Author.String(),
			Content:     string(pub.Content),
			CreateTime:  timestamppb.New(pub.CreateTime),
			UpdateTime:  timestamppb.New(pub.UpdateTime),
			PublishTime: timestamppb.New(pub.PublishTime),
		},
		Version:       pub.Version,
		LatestVersion: pub.Version,
	}
}

func (srv *docsAPI) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	if in.Version != "" {
		return nil, status.Error(codes.Unimplemented, "requesting specific version is not implemented yet")
	}

	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	state, err := srv.back.LoadState(ctx, c)
	if err != nil {
		return nil, err
	}

	if state.size == 0 {
		return nil, status.Errorf(codes.NotFound, "publication with id %s is not found", in.DocumentId)
	}

	pub, err := publicationFromChanges(state)
	if err != nil {
		return nil, err
	}

	return pubToProto(in.DocumentId, pub), nil
}

func (srv *docsAPI) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	list, err := srv.back.ListPublications(ctx)
	if err != nil {
		return nil, err
	}

	out := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, len(list)),
	}

	acc, err := srv.back.Account()
	if err != nil {
		return nil, err
	}

	aid := acc.id.String()

	for i, l := range list {
		out.Publications[i] = &documents.Publication{
			Document: &documents.Document{
				Id:          cid.NewCidV1(uint64(l.ObjectsCodec), l.ObjectsMultihash).String(),
				Author:      aid,
				Title:       l.PublicationsTitle,
				Subtitle:    l.PublicationsSubtitle,
				CreateTime:  timestamppb.New(timeFromSeconds(l.PublicationsCreateTime)),
				UpdateTime:  timestamppb.New(timeFromSeconds(l.PublicationsUpdateTime)),
				PublishTime: timestamppb.New(timeFromSeconds(l.PublicationsPublishTime)),
			},
			Version:       l.PublicationsLatestVersion,
			LatestVersion: l.PublicationsLatestVersion,
		}
	}

	return out, nil
}

func (srv *docsAPI) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	err = srv.back.DeletePublication(ctx, c)

	return &emptypb.Empty{}, err
}

// TODO(burdiyan): implement a delete publication.
// How can we delete if there's no single version?

func (srv *docsAPI) parseDocumentID(id string) (cid.Cid, error) {
	c, err := cid.Decode(id)
	if err != nil {
		return cid.Undef, status.Errorf(codes.InvalidArgument, "failed to parse document id %s: %v", id, err)
	}
	return c, nil
}
