package documents

import (
	"context"
	"fmt"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hyper"
	"seed/backend/pkg/errutil"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetChangeInfo implements the Changes server.
func (api *Server) GetChangeInfo(ctx context.Context, in *documents.GetChangeInfoRequest) (*documents.ChangeInfo, error) {
	c, err := cid.Decode(in.Id)
	if err != nil {
		return nil, errutil.ParseError("id", in.Id, c, err)
	}

	var ch hyper.Change
	if err := api.blobs.LoadBlob(ctx, c, &ch); err != nil {
		return nil, err
	}

	var kd hyper.KeyDelegation
	if err := api.blobs.LoadBlob(ctx, ch.Delegation, &kd); err != nil {
		return nil, fmt.Errorf("failed to find key delegation for change %s: %w", in.Id, err)
	}

	return changeToProto(c, ch, kd), nil
}

// ListChanges implements the Changes server.
func (api *Server) ListChanges(ctx context.Context, in *documents.ListChangesRequest) (*documents.ListChangesResponse, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must provide document id")
	}

	eid := hyper.EntityID(in.DocumentId)

	out := &documents.ListChangesResponse{}

	dels := map[cid.Cid]hyper.KeyDelegation{}

	if err := api.blobs.ForEachChange(ctx, eid, func(c cid.Cid, ch hyper.Change) error {
		kd, ok := dels[ch.Delegation]
		if !ok {
			if err := api.blobs.LoadBlob(ctx, ch.Delegation, &kd); err != nil {
				return fmt.Errorf("failed to load key delegation for change info listing: %w", err)
			}
			dels[ch.Delegation] = kd
		}

		out.Changes = append(out.Changes, changeToProto(c, ch, kd))

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

func changeToProto(c cid.Cid, ch hyper.Change, kd hyper.KeyDelegation) *documents.ChangeInfo {
	outpb := &documents.ChangeInfo{
		Id:         c.String(),
		Author:     kd.Issuer.String(),
		Version:    c.String(),
		CreateTime: timestamppb.New(ch.HLCTime.Time()),
	}
	if len(ch.Deps) == 0 {
		return outpb
	}

	outpb.Deps = make([]string, len(ch.Deps))
	for i, dep := range ch.Deps {
		outpb.Deps[i] = dep.String()
	}

	return outpb
}
