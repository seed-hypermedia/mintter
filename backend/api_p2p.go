package backend

import (
	"context"
	"fmt"
	"net/http"

	"encoding/hex"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/db/sqliteschema"
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

	conn := srv.back.pool.Get(ctx)
	if conn == nil {
		return nil, fmt.Errorf("coulnd't get sqlite connector from the pool before timeout")
	}
	defer srv.back.pool.Put(conn)

	id, err := sqliteschema.GetDefaultWallet(conn)
	if err != nil {
		return nil, err
	}

	wallet, err := sqliteschema.GetWallet(conn, id)
	if err != nil {
		return nil, err
	}

	if len(wallet) != 1 {
		return nil, fmt.Errorf("expecting one default wallet but got %d ", len(wallet))
	}

	if wallet[0].Type != "lndhub" {
		return nil, fmt.Errorf("cannot create invoice out of a wallet of type %s ", wallet[0].Type)
	}

	if in.HoldInvoice {
		return nil, fmt.Errorf("default wallet %s does not accept hold invoice", wallet[0].Name)
	}

	lndHubClient := lndhub.NewClient(&http.Client{})

	pay_req, err := lndHubClient.CreateInvoice(ctx, lndhub.Credentials{
		Token: hex.EncodeToString(wallet[0].Auth)}, in.AmountSats, in.Memo)
	if err != nil {
		return nil, err
	}

	return &p2p.RequestInvoiceResponse{PayReq: pay_req}, nil
}
