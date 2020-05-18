package server

import (
	"context"
	"fmt"
	"mintter/backend/ipldutil"
	"mintter/backend/publishing"
	"mintter/proto"
	"time"

	"github.com/golang/protobuf/ptypes"
	"github.com/google/uuid"
	"github.com/ipfs/go-cid"
	format "github.com/ipfs/go-ipld-format"
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

	return s.store.GetDraft(in.DocumentId)
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

	pub := publishing.Publication{
		DocumentID:  draft.DocumentId,
		Title:       draft.Title,
		Description: draft.Description,
		Author:      draft.Author,
		Sections:    make([]cid.Cid, len(sects)),
	}

	ipldNodes := make([]format.Node, 0, len(sects)+1) // All sections + publication itself.

	prof, err := s.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	for i, sec := range sects {
		n, err := ipldutil.MarshalSigned(sec, prof.Account.PrivKey)
		if err != nil {
			return nil, err
		}

		ipldNodes = append(ipldNodes, n)
		pub.Sections[i] = n.Cid()
	}

	pubnode, err := ipldutil.MarshalSigned(pub, prof.Account.PrivKey)
	if err != nil {
		return nil, err
	}

	ipldNodes = append(ipldNodes, pubnode)

	if err := s.node.DAG().AddMany(ctx, ipldNodes); err != nil {
		return nil, fmt.Errorf("failed to add IPLD nodes: %w", err)
	}

	if err := s.store.AddPublication(pub.DocumentID, pubnode.Cid()); err != nil {
		return nil, fmt.Errorf("failed to add publication to store: %w", err)
	}

	return publicationToProto(pubnode.Cid(), pub)
}

// ListPublications stored on the server.
func (s *Server) ListPublications(ctx context.Context, in *proto.ListPublicationsRequest) (*proto.ListPublicationsResponse, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.PageSize != 0 || in.PageToken != "" {
		return nil, status.Error(codes.Unimplemented, "pagination for this request is not implemented yet - make the request without limiting page size and with no page token")
	}

	cids, err := s.store.ListPublications(0, 0)
	if err != nil {
		return nil, err
	}

	prof, err := s.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	pubs := make([]*proto.Publication, 0, len(cids))

	for item := range s.node.DAG().GetMany(ctx, cids) {
		if item.Err != nil {
			return nil, fmt.Errorf("failed to get block: %w", item.Err)
		}

		var v publishing.Publication
		if err := ipldutil.UnmarshalSigned(item.Node.RawData(), &v, prof.Account.PubKey); err != nil {
			return nil, err
		}

		p, err := publicationToProto(item.Node.Cid(), v)
		if err != nil {
			return nil, err
		}

		pubs = append(pubs, p)
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

	node, err := s.node.DAG().Get(ctx, secid)
	if err != nil {
		return nil, fmt.Errorf("failed to get IPLD node: %w", err)
	}

	var sect publishing.Section

	prof, err := s.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	if err := ipldutil.UnmarshalSigned(node.RawData(), &sect, prof.Account.PubKey); err != nil {
		return nil, fmt.Errorf("failed to decode CBOR node: %w", err)
	}

	return sectionToProto(sect)
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

	prof, err := s.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	resp := &proto.BatchGetSectionsResponse{
		Sections: make([]*proto.Section, 0, len(cids)),
	}

	for item := range s.node.DAG().GetMany(ctx, cids) {
		if item.Err != nil {
			return nil, item.Err
		}

		var v publishing.Section

		if err := ipldutil.UnmarshalSigned(item.Node.RawData(), &v, prof.Account.PubKey); err != nil {
			return nil, err
		}

		secpb, err := sectionToProto(v)
		if err != nil {
			return nil, err
		}

		resp.Sections = append(resp.Sections, secpb)
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
