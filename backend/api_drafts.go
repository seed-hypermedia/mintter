package backend

import (
	"context"
	"fmt"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	documents "mintter/api/go/documents/v1alpha"
)

type draftsAPI struct {
	documents.UnimplementedDraftsServer
	back *backend
}

func newDraftsAPI(back *backend) documents.DraftsServer {
	return &draftsAPI{
		back: back,
	}
}

func (srv *draftsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	pn, err := srv.back.NewDocumentPermanode()
	if err != nil {
		return nil, fmt.Errorf("failed to create permanode: %v", err)
	}

	acc, err := srv.back.repo.Account()
	if err != nil {
		return nil, err
	}

	doc := &documents.Document{
		Id:         pn.blk.Cid().String(),
		Author:     acc.id.String(),
		CreateTime: timestamppb.New(pn.perma.CreateTime),
		UpdateTime: timestamppb.New(pn.perma.CreateTime),
	}

	data, err := proto.Marshal(doc)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal document: %w", err)
	}

	if _, err := srv.back.CreateDraft(ctx, pn, data); err != nil {
		return nil, fmt.Errorf("failed to store draft: %w", err)
	}

	return doc, nil
}
