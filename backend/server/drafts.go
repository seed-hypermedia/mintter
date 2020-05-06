package server

import (
	"context"
	"fmt"
	"mintter/proto"

	"github.com/golang/protobuf/ptypes"
	"github.com/google/uuid"
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
	if in.DocumentId == "" {
		return nil, status.Error(codes.InvalidArgument, "documentId is required")
	}

	return s.store.GetDraft(in.DocumentId)
}

// ListDrafts implements DocumentsServer.
func (s *Server) ListDrafts(ctx context.Context, in *proto.ListDraftsRequest) (*proto.ListDraftsResponse, error) {
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
