package backend

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"encoding/hex"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/lndhub"
	"mintter/backend/wallet"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type p2pAPI struct {
	p2p.UnimplementedP2PServer
	back *backend
}

func (srv *p2pAPI) GetPeerInfo(ctx context.Context, in *p2p.GetPeerInfoRequest) (*p2p.PeerInfo, error) {
	acc, err := srv.back.Account()
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

	return srv.back.GetObjectVersion(ctx, oid)
}

func (srv *p2pAPI) RequestInvoice(ctx context.Context, in *p2p.RequestInvoiceRequest) (*p2p.RequestInvoiceResponse, error) {
	conn := srv.back.pool.Get(ctx)
	if conn == nil {
		return nil, fmt.Errorf("coulnd't get sqlite connector from the pool before timeout")
	}
	defer srv.back.pool.Put(conn)

	defaultWallet, err := wallet.GetDefaultWallet(conn)
	if err != nil {
		return nil, err
	}

	if strings.ToLower(defaultWallet.Type) != lndhub.LndhubWalletType {
		return nil, fmt.Errorf("cannot create invoice out of a wallet of type %s ", defaultWallet.Type)
	}

	if in.HoldInvoice {
		return nil, fmt.Errorf("default wallet %s does not accept hold invoice", defaultWallet.Name)
	}

	lndHubClient := lndhub.NewClient(&http.Client{})

	auth, err := wallet.GetAuth(conn, defaultWallet.ID)
	if err != nil {
		return nil, fmt.Errorf("couldn't get auth info from default wallet. Error %s", err.Error())
	}

	wallet, err := wallet.GetWallet(conn, defaultWallet.ID)
	if err != nil {
		return nil, fmt.Errorf("couldn't get default wallet info. Error %s", err.Error())
	}

	payReq, err := lndHubClient.CreateInvoice(ctx, lndhub.Credentials{
		ConnectionURL: wallet.Address,
		Token:         hex.EncodeToString(auth)}, in.AmountSats, in.Memo)
	if err != nil {
		return nil, fmt.Errorf("couldn't create invoice. %s", err.Error())
	}

	return &p2p.RequestInvoiceResponse{PayReq: payReq}, nil
}
