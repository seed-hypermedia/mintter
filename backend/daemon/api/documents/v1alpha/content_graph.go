package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
)

func (srv *Server) ListCitations(ctx context.Context, in *documents.ListCitationsRequest) (*documents.ListCitationsResponse, error) {
	return &documents.ListCitationsResponse{}, nil
}
