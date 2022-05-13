package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (n *rpcHandler) GetObjectVersion(ctx context.Context, in *p2p.GetObjectVersionRequest) (*p2p.Version, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetObjectVersion not implemented")
}
