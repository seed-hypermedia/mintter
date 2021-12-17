package backend

import (
	"context"
	documents "mintter/backend/api/documents/v1alpha"
)

func (srv *docsAPI) ListCitations(context.Context, *documents.ListCitationsRequest) (*documents.ListCitationsResponse, error) {
	return nil, nil
}
