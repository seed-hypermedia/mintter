package apisrv

import (
	"context"
	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/core"
	"mintter/backend/core/registration"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Accounts struct {
	reg  *registration.Service
	accs core.AccountRepository
}

func (srv *Accounts) GetAccount(ctx context.Context, in *accounts.GetAccountRequest) (*accounts.Account, error) {
	var aid core.AccountID
	if in.Id == "" {
		a, err := srv.reg.AccountID(ctx)
		if err != nil {
			return nil, err
		}
		aid = a
	} else {
		if err := aid.FromString(in.Id); err != nil {
			return nil, err
		}
	}

	acc, err := srv.accs.LoadAccount(ctx, aid)
	if err != nil {
		return nil, err
	}

	return accountToProto(acc)
}

func (srv *Accounts) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	prof, err := profileFromProto(in)
	if err != nil {
		return nil, err
	}

	did := srv.reg.DeviceID()

	acc, err := srv.accs.LoadAccountForDevice(ctx, did)
	if err != nil {
		return nil, err
	}

	acc.UpdateAlias(prof.Alias)

	if err := acc.UpdateEmail(prof.Email); err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to update email: %v", err)
	}

	acc.UpdateBio(prof.Bio)

	if err := srv.accs.StoreAccount(ctx, acc); err != nil {
		return nil, err
	}

	return accountToProto(acc)
}

func (srv *Accounts) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	accs, err := srv.accs.ListAccounts(ctx, 0, "")
	if err != nil {
		return nil, err
	}

	resp := &accounts.ListAccountsResponse{
		Accounts: make([]*accounts.Account, len(accs.Accounts)),
	}

	for i, acc := range accs.Accounts {
		accpb, err := accountToProto(acc)
		if err != nil {
			return nil, err
		}
		resp.Accounts[i] = accpb
	}

	return resp, nil
}

func accountToProto(acc *core.AccountAggregate) (*accounts.Account, error) {
	// TODO
	return nil, nil
}

func profileFromProto(ppb *accounts.Profile) (core.Profile, error) {
	// TODO
	return core.Profile{}, nil
}
