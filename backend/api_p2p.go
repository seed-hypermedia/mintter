package backend

import (
	"context"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	p2p "mintter/backend/api/p2p/v1alpha"
)

type p2pAPI struct {
	p2p.UnimplementedP2PServer
	back *backend
}

func (srv *p2pAPI) GetPeerInfo(ctx context.Context, in *p2p.GetPeerInfoRequest) (*p2p.PeerInfo, error) {
	acc, err := srv.back.repo.Account()
	if err != nil {
		return nil, err
	}

	return &p2p.PeerInfo{
		AccountId: acc.id.String(),
	}, nil
}

func (srv *p2pAPI) GetObjectVersion(ctx context.Context, in *p2p.GetObjectVersionRequest) (*p2p.Version, error) {
	oid, err := cid.Decode(in.ObjectId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "can't decode object ID %s: %v", in.ObjectId, err)
	}

	return srv.back.patches.GetObjectVersion(ctx, oid)
}

func (srv *p2pAPI) GetInvoice(ctx context.Context, in *p2p.GetInvoiceRequest) (*p2p.PayReq, error) {
	// TODO: generating the invoice here

	return &p2p.PayReq{PayReq: "fakeinvoice"}, nil
}
