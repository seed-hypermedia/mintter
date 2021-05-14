package backend

import (
	"context"
	"fmt"

	accounts "mintter/api/go/accounts/v1alpha"
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
	if in.Id != "" {
		panic("BUG: not implemented searching other accounts yet")
	}

	acc, err := srv.back.repo.Account()
	if err != nil {
		return nil, err
	}

	_, resp, err := srv.back.GetAccountState(ctx, acc.id)
	if err != nil {
		return nil, fmt.Errorf("failed to hydrate account state: %w", err)
	}

	return resp, nil
}

func (srv *accountsAPI) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	return srv.back.UpdateProfile(ctx, in)
}

func (srv *accountsAPI) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	return nil, nil
}

func (srv *accountsAPI) StartAccountDiscovery(ctx context.Context, in *accounts.StartAccountDiscoveryRequest) (*accounts.StartAccountDiscoveryResponse, error) {
	// Join topic
	// Start looking for peers
	return nil, nil
}
