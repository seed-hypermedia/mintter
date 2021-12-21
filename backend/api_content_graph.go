package backend

import (
	"context"
	documents "mintter/backend/api/documents/v1alpha"
)

func (srv *docsAPI) ListCitations(ctx context.Context, in *documents.ListCitationsRequest) (*documents.ListCitationsResponse, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	links, err := srv.back.ListBacklinks(ctx, c, int(in.Depth))
	if err != nil {
		return nil, err
	}
	// No backlinks is not an error, so we should return an empty collection.
	if links == nil {
		return &documents.ListCitationsResponse{}, nil
	}

	resp := &documents.ListCitationsResponse{
		Links: make([]*documents.Link, len(links)),
	}

	for i, l := range links {
		resp.Links[i] = backlinkToProto(l)
	}

	return resp, nil
}

func backlinkToProto(b Backlink) *documents.Link {
	var sourceVersion string
	if b.SourceChange.Defined() {
		sourceVersion = b.SourceChange.String()
	}

	return &documents.Link{
		Source: &documents.LinkNode{
			DocumentId: b.SourceDocumentID.String(),
			BlockId:    b.SourceBlockID,
			Version:    sourceVersion,
		},
		Target: &documents.LinkNode{
			DocumentId: b.TargetDocumentID.String(),
			BlockId:    b.TargetBlockID,
			Version:    b.TargetVersion,
		},
	}
}
