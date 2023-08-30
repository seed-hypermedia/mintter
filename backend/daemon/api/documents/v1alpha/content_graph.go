package documents

import (
	"context"
	"encoding/json"
	"fmt"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ListCitations implements the corresponding gRPC method.
func (srv *Server) ListCitations(ctx context.Context, in *documents.ListCitationsRequest) (*documents.ListCitationsResponse, error) {
	if in.DocumentId == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify document ID")
	}

	targetEntity := "hd://d/" + in.DocumentId

	var backlinks []hypersql.BacklinksForEntityResult
	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		edb, err := hypersql.EntitiesLookupID(conn, targetEntity)
		if err != nil {
			return err
		}

		list, err := hypersql.BacklinksForEntity(conn, edb.EntitiesID)
		backlinks = list
		return err
	}); err != nil {
		return nil, err
	}

	resp := &documents.ListCitationsResponse{
		Links: make([]*documents.Link, len(backlinks)),
	}

	for i, link := range backlinks {
		var ld hyper.LinkData
		if err := json.Unmarshal(link.BlobAttrsExtra, &ld); err != nil {
			return nil, fmt.Errorf("failed to decode link data: %w", err)
		}

		src := cid.NewCidV1(uint64(link.BlobsCodec), link.BlobsMultihash)

		resp.Links[i] = &documents.Link{
			Source: &documents.LinkNode{
				DocumentId: hyper.EntityID(link.EntitiesEID).TrimPrefix("hd://d/"),
				BlockId:    link.BlobAttrsAnchor,
				Version:    src.String(),
			},
			Target: &documents.LinkNode{
				DocumentId: in.DocumentId,
				BlockId:    ld.TargetFragment,
				Version:    ld.TargetVersion,
			},
		}
	}

	return resp, nil
}
