package backend

import (
	"context"
	"sync"

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
	CreateDraft(context.Context) (Draft, error)
	CreateDraftFromPublication(context.Context, cid.Cid) (Draft, error)
	GetDraft(context.Context, cid.Cid) (Draft, error)
	UpdateDraft(ctx context.Context, c cid.Cid, title, subtitle string, content ContentWithLinks) (Draft, error)
	PublishDraft(ctx context.Context, c cid.Cid) (Publication, error)
	ListDrafts(context.Context) ([]draftsListResult, error)
	DeleteDraft(context.Context, cid.Cid) error

	Account() (PublicAccount, error)

	GetPublication(context.Context, cid.Cid) (Publication, error)
	LoadState(ctx context.Context, obj cid.Cid) (*changeset, error)
	ListPublications(ctx context.Context) ([]publicationsListResult, error)
	DeletePublication(ctx context.Context, c cid.Cid) (err error)

	ListBacklinks(context.Context, cid.Cid, int) ([]Backlink, error)
}

type docsAPI struct {
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
		docid, err := srv.parseDocumentID(in.ExistingDocumentId)
		if err != nil {
			return nil, err
		}

		draft, err := srv.back.CreateDraftFromPublication(ctx, docid)
		if err != nil {
			return nil, err
		}

		return draftToProto(draft), nil
	}

	d, err := srv.back.CreateDraft(ctx)
	if err != nil {
		return nil, err
	}

	return draftToProto(d), nil
}

func draftToProto(d Draft) *documents.Document {
	return &documents.Document{
		Id:         d.ID.String(),
		Author:     d.Author.String(),
		Title:      d.Title,
		Subtitle:   d.Subtitle,
		Content:    string(d.Content),
		CreateTime: timestamppb.New(d.CreateTime),
		UpdateTime: timestamppb.New(d.UpdateTime),
	}
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

	cwl := ContentWithLinks{
		Content: []byte(in.Document.Content),
	}
	if in.Links != nil {
		cwl.Links = make(map[Link]struct{}, len(in.Links))
	}

	for _, l := range in.Links {
		target, err := cid.Decode(l.GetTarget().DocumentId)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "failed to parse target document ID: %v", err)
		}

		// TODO: improve input validation here and return meaningful errors.
		ll := Link{
			SourceBlockID:    l.GetSource().GetBlockId(),
			TargetDocumentID: target,
			TargetBlockID:    l.GetTarget().BlockId,
			TargetVersion:    Version(l.GetTarget().Version),
		}

		cwl.Links[ll] = struct{}{}
	}

	d, err := srv.back.UpdateDraft(ctx, c, in.Document.Title, in.Document.Subtitle, cwl)
	if err != nil {
		return nil, err
	}

	return draftToProto(d), nil
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
		Version:       pub.Version.String(),
		LatestVersion: pub.Version.String(),
	}
}

func (srv *docsAPI) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	// TODO: implement getting specific version of the publication.

	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	pub, err := srv.back.GetPublication(ctx, c)
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

	for i, l := range list {
		if l.AccountsCodec != int(codecAccountID) {
			panic("BUG: wrong codec for account")
		}
		aid := cid.NewCidV1(uint64(l.AccountsCodec), l.AccountsMultihash)
		pubid := cid.NewCidV1(uint64(l.ObjectsCodec), l.ObjectsMultihash).String()
		out.Publications[i] = &documents.Publication{
			Document: &documents.Document{
				Id:          pubid,
				Author:      aid.String(),
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
