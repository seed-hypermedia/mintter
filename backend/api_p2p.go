package backend

import (
	"context"
	"net/http"

	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/lndhub"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

func (srv *p2pAPI) RequestInvoice(ctx context.Context, in *p2p.RequestInvoiceRequest) (*p2p.RequestInvoiceResponse, error) {

	// TODO: obtain the wallet type and credentials (token in case lndhub and macaroon in case LND) from sqlite database
	//conn := srv.back.pool.Get()
	// TODO: Get the wallet type. In both cases (lndhub or LND) whe should call a CreateInvoice Method but we need to authenticate LND with macaroon
	// both methods have to have the same signature so they can be called from interface. Change LND functions in the other branch to match lndhub!!

	//TODO: now LND is not implemented

	lndHubClient := lndhub.NewClient(&http.Client{})
	pay_req, err := lndHubClient.CreateInvoice(ctx, lndhub.Credentials{
		Token: "4e265465cac4cd3d9d50f84cacc7f4dd0cbd9ed1"}, uint64(1), "hardcoded invoice")
	if err != nil {
		return nil, err
	}

	return &p2p.RequestInvoiceResponse{PayReq: pay_req}, nil
}
