package backend

import (
	"context"
	"fmt"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/ipfs"
)

type accountsAPI struct {
	back *backend
}

func newAccountsAPI(back *backend) accounts.AccountsServer {
	return &accountsAPI{
		back: back,
	}
}

func (srv *accountsAPI) GetAccount(ctx context.Context, in *accounts.GetAccountRequest) (*accounts.Account, error) {
	var aid AccountID
	if in.Id == "" {
		acc, err := srv.back.repo.Account()
		if err != nil {
			return nil, err
		}
		aid = acc.id
	} else {
		c, err := cid.Decode(in.Id)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "can't decode account id as CID: %v", err)
		}

		acodec, _ := ipfs.DecodeCID(c)
		if acodec != codecAccountID {
			return nil, fmt.Errorf("wrong codec for account")
		}

		aid = AccountID(c)
	}

	state, err := srv.back.GetAccountState(ctx, aid)
	if err != nil {
		return nil, err
	}

	if state.size == 0 {
		return nil, fmt.Errorf("no information about account: %s", aid.String())
	}

	account, err := accountFromState(state)
	if err != nil {
		return nil, fmt.Errorf("failed to hydrate account state %s: %w", aid, err)
	}

	return account, nil
}

func (srv *accountsAPI) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	return srv.back.UpdateProfile(ctx, in)
}

func (srv *accountsAPI) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	accs, err := srv.back.ListAccounts(ctx)
	if err != nil {
		return nil, err
	}

	return &accounts.ListAccountsResponse{
		Accounts: accs,
	}, nil
}
