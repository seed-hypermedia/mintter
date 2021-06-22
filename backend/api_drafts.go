package backend

import (
	documents "mintter/api/go/documents/v1alpha"
)

type draftsAPI struct {
	documents.UnimplementedDraftsServer
	back *backend
}

func newDraftsAPI(back *backend) documents.DraftsServer {
	return &draftsAPI{}
}

// func (srv *draftsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
// 	return nil, nil
// }
