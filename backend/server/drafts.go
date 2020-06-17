package server

import (
	"context"
	"fmt"
	"time"

	"mintter/backend/publishing"
	"mintter/backend/store"
	"mintter/proto"

	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/empty"
	"github.com/google/uuid"
	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// CreateDraft implements DocumentsServer.
func (s *Server) CreateDraft(ctx context.Context, in *proto.CreateDraftRequest) (*proto.Draft, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	prof, err := s.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	now := ptypes.TimestampNow()

	draft := &proto.Draft{
		DocumentId: uuid.New().String(),
		Author:     prof.ID.String(),
		CreateTime: now,
		UpdateTime: now,
	}

	if err := s.store.StoreDraft(draft); err != nil {
		return nil, fmt.Errorf("failed to store draft: %w", err)
	}

	return draft, nil
}

// SaveDraft implements DocumentsServer.
func (s *Server) SaveDraft(ctx context.Context, in *proto.Draft) (*proto.Draft, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.DocumentId == "" {
		return nil, status.Error(codes.InvalidArgument, "documentId is required")
	}

	old, err := s.store.GetDraft(in.DocumentId)
	if err != nil {
		return nil, err
	}

	old.UpdateTime = ptypes.TimestampNow()
	old.Title = in.Title
	old.Sections = in.Sections
	old.Description = in.Description

	if err := s.store.StoreDraft(old); err != nil {
		return nil, fmt.Errorf("failed to store draft: %w", err)
	}

	return old, nil
}

// GetDraft implements DocumentsServer.
func (s *Server) GetDraft(ctx context.Context, in *proto.GetDraftRequest) (*proto.Draft, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.DocumentId == "" {
		return nil, status.Error(codes.InvalidArgument, "documentId is required")
	}

	d, err := s.store.GetDraft(in.DocumentId)
	if err != nil {
		return nil, storeErrorToProto(err)
	}

	return d, nil
}

// ListDrafts implements DocumentsServer.
func (s *Server) ListDrafts(ctx context.Context, in *proto.ListDraftsRequest) (*proto.ListDraftsResponse, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.PageSize != 0 || in.PageToken != "" {
		return nil, status.Error(codes.Unimplemented, "pagination for this request is not implemented yet - make the request without limiting page size and with no page token")
	}

	drafts, err := s.store.ListDrafts(0, 0)
	if err != nil {
		return nil, err
	}

	return &proto.ListDraftsResponse{
		Drafts: drafts,
	}, nil
}

// PublishDraft implements DocumentsServer.
func (s *Server) PublishDraft(ctx context.Context, in *proto.PublishDraftRequest) (*proto.Publication, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.DocumentId == "" {
		return nil, status.Error(codes.InvalidArgument, "document ID is required")
	}

	draft, err := s.store.GetDraft(in.DocumentId)
	if err != nil {
		return nil, err
	}

	sects, err := sectionsFromDraft(draft)
	if err != nil {
		return nil, err
	}

	sectcids, err := s.node.AddSections(ctx, sects...)
	if err != nil {
		return nil, fmt.Errorf("failed to add sections: %w", err)
	}

	pub := publishing.Publication{
		DocumentID:  draft.DocumentId,
		Title:       draft.Title,
		Description: draft.Description,
		Author:      draft.Author,
		Sections:    sectcids,
	}

	pubcid, err := s.node.AddPublication(ctx, pub)
	if err != nil {
		return nil, fmt.Errorf("failed to add publication: %w", err)
	}

	if err := s.store.DeleteDraft(in.DocumentId); err != nil {
		s.log.Error("FailedDeletingDraft", zap.Error(err), zap.String("documentID", in.DocumentId))
	}

	return publicationToProto(pubcid, pub)
}

// DeleteDraft implements DocumentsServer.
func (s *Server) DeleteDraft(ctx context.Context, in *proto.DeleteDraftRequest) (*empty.Empty, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if err := s.store.DeleteDraft(in.DocumentId); err != nil {
		return nil, err
	}

	return &empty.Empty{}, nil
}

// GetPublication from IPFS.
func (s *Server) GetPublication(ctx context.Context, in *proto.GetPublicationRequest) (*proto.Publication, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	cid, err := cid.Decode(in.PublicationId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to decode publication CID: %v", err)
	}

	pub, err := s.node.GetPublication(ctx, cid)
	if err != nil {
		return nil, err
	}

	return publicationToProto(cid, pub)
}

// ListPublications stored on the server.
func (s *Server) ListPublications(ctx context.Context, in *proto.ListPublicationsRequest) (*proto.ListPublicationsResponse, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.PageSize != 0 || in.PageToken != "" {
		return nil, status.Error(codes.Unimplemented, "pagination for this request is not implemented yet - make the request without limiting page size and with no page token")
	}

	cids, err := s.store.ListPublications("", 0, 0)
	if err != nil {
		return nil, err
	}

	pubs := make([]*proto.Publication, len(cids))

	for i, cid := range cids {
		// TODO(burdiyan): find a way to optimize this and get multiple nodes in one request preserve CID for the UI.
		pub, err := s.node.GetPublication(ctx, cid)
		if err != nil {
			return nil, err
		}

		pbpub, err := publicationToProto(cid, pub)
		if err != nil {
			return nil, err
		}

		pubs[i] = pbpub
	}

	return &proto.ListPublicationsResponse{
		Publications: pubs,
	}, nil
}

// GetSection implements DocumentsServer.
func (s *Server) GetSection(ctx context.Context, in *proto.GetSectionRequest) (*proto.Section, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	secid, err := cid.Decode(in.SectionId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode section CID: %w", err)
	}

	sects, err := s.node.GetSections(ctx, secid)
	if err != nil {
		return nil, fmt.Errorf("failed to get IPLD node: %w", err)
	}

	return sectionToProto(sects[0])
}

// BatchGetSections implements DocumentsServer.
func (s *Server) BatchGetSections(ctx context.Context, in *proto.BatchGetSectionsRequest) (*proto.BatchGetSectionsResponse, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	cids, err := cidsFromStrings(in.SectionIds)
	if err != nil {
		return nil, err
	}

	resp := &proto.BatchGetSectionsResponse{
		Sections: make([]*proto.Section, len(cids)),
	}

	sects, err := s.node.GetSections(ctx, cids...)
	if err != nil {
		return nil, err
	}

	for i, sec := range sects {
		pbsec, err := sectionToProto(sec)
		if err != nil {
			return nil, err
		}

		resp.Sections[i] = pbsec
	}

	return resp, nil
}

func cidStringList(cids []cid.Cid) []string {
	out := make([]string, len(cids))

	for i, c := range cids {
		out[i] = c.String()
	}

	return out
}

func cidsFromStrings(list []string) ([]cid.Cid, error) {
	out := make([]cid.Cid, len(list))

	for i, l := range list {
		cid, err := cid.Decode(l)
		if err != nil {
			return nil, err
		}

		out[i] = cid
	}

	return out, nil
}

func sectionsFromDraft(d *proto.Draft) ([]publishing.Section, error) {
	out := make([]publishing.Section, len(d.Sections))

	for i, s := range d.Sections {
		sec := publishing.Section{
			DocumentID:  s.DocumentId,
			Title:       s.Title,
			Description: s.Description,
			Author:      s.Author,
			Body:        s.Body,
		}

		if s.CreateTime != nil {
			t, err := ptypes.Timestamp(s.CreateTime)
			if err != nil {
				return nil, err
			}

			sec.CreateTime = t.UTC().Format(time.RFC3339)
		}

		if sec.Author == "" {
			sec.Author = d.Author
		}

		if sec.Title == "" {
			sec.Title = d.Title
		}

		if sec.Description == "" {
			sec.Description = d.Description
		}

		out[i] = sec
	}

	return out, nil
}

func sectionToProto(s publishing.Section) (*proto.Section, error) {
	pbsec := &proto.Section{
		DocumentId:  s.DocumentID,
		Title:       s.Title,
		Description: s.Description,
		Author:      s.Author,
		Body:        s.Body,
	}

	if s.CreateTime != "" {
		ct, err := time.ParseInLocation(time.RFC3339, s.CreateTime, time.UTC)
		if err != nil {
			return nil, err
		}

		t, err := ptypes.TimestampProto(ct)
		if err != nil {
			return nil, err
		}

		pbsec.CreateTime = t
	}

	return pbsec, nil
}

func publicationToProto(id cid.Cid, p publishing.Publication) (*proto.Publication, error) {
	pubpb := &proto.Publication{
		Id:          id.String(),
		DocumentId:  p.DocumentID,
		Title:       p.Title,
		Description: p.Description,
		Author:      p.Author,
		Previous:    "",
		Sections:    cidStringList(p.Sections),
	}

	return pubpb, nil
}

func storeErrorToProto(err error) error {
	if store.IsNotFound(err) {
		return status.Error(codes.NotFound, err.Error())
	}

	return status.Error(codes.Internal, err.Error())
}

func addrSlice(mas ...multiaddr.Multiaddr) []string {
	out := make([]string, len(mas))

	for i, ma := range mas {
		out[i] = ma.String()
	}

	return out
}
