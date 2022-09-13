package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/vcs/vcssql"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ListCitations implements the corresponding gRPC method.
func (srv *Server) ListCitations(ctx context.Context, in *documents.ListCitationsRequest) (*documents.ListCitationsResponse, error) {
	c, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "bad document id: %v", err)
	}

	conn, release, err := srv.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	docdb, err := vcssql.IPFSBlocksLookupPK(conn, c.Hash())
	if err != nil {
		return nil, err
	}

	list, err := vcssql.BacklinksListByTargetDocument(conn, docdb.IPFSBlocksID, int(in.Depth))
	if err != nil {
		return nil, err
	}

	resp := &documents.ListCitationsResponse{
		Links: make([]*documents.Link, len(list)),
	}

	for i, l := range list {
		resp.Links[i] = &documents.Link{
			Source: &documents.LinkNode{
				DocumentId: cid.NewCidV1(cid.DagCBOR, l.SourceDocumentMultihash).String(),
				BlockId:    l.ContentLinksSourceBlockID,
				Version:    l.ContentLinksSourceVersion,
			},
			Target: &documents.LinkNode{
				DocumentId: cid.NewCidV1(cid.DagCBOR, l.TargetDocumentMultihash).String(),
				BlockId:    l.ContentLinksTargetBlockID,
				Version:    l.ContentLinksTargetVersion,
			},
		}
	}

	return resp, nil
}
