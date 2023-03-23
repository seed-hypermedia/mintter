package documents

import (
	"context"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/pkg/errutil"
	"mintter/backend/vcs"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetChangeInfo implements the Changes server.
func (api *Server) GetChangeInfo(ctx context.Context, in *documents.GetChangeInfoRequest) (*documents.ChangeInfo, error) {
	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	c, err := cid.Decode(in.Id)
	if err != nil {
		return nil, errutil.ParseError("id", in.Id, c, err)
	}

	info, err := conn.GetPublicChangeInfo(c)
	if err != nil {
		return nil, err
	}

	resp := &documents.ChangeInfo{
		Id:         in.Id,
		Author:     info.Author.String(),
		CreateTime: timestamppb.New(info.CreateTime),
		Version:    vcs.NewVersion(c).String(),
	}

	return resp, nil
}

// ListChanges implements the Changes server.
func (api *Server) ListChanges(ctx context.Context, in *documents.ListChangesRequest) (*documents.ListChangesResponse, error) {
	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	obj, err := cid.Decode(in.ObjectId)
	if err != nil {
		return nil, errutil.ParseError("objectID", in.ObjectId, obj, err)
	}

	infos, err := conn.ListChanges(obj)
	if err != nil {
		return nil, err
	}

	resp := &documents.ListChangesResponse{
		Changes: make([]*documents.ChangeInfo, len(infos)),
	}

	for i, info := range infos {
		resp.Changes[i] = &documents.ChangeInfo{
			Id:         info.ID.String(),
			Author:     info.Author.String(),
			CreateTime: timestamppb.New(info.CreateTime),
			Version:    vcs.NewVersion(info.ID).String(),
		}
	}

	return resp, nil
}
