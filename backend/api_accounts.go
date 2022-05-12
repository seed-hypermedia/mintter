package backend

import (
	"context"

	"github.com/ipfs/go-cid"

	"mintter/backend/core"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
)

type accountsAPI struct {
	back *backend

	*accounts.Server
}

func newAccountsAPI(back *backend, id *future.ReadOnly[core.Identity], v *vcs.SQLite) accounts.AccountsServer {
	return &accountsAPI{
		back:   back,
		Server: accounts.NewServer(id, v),
	}
}

func (srv *accountsAPI) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	accs, err := srv.back.ListAccounts(ctx)
	if err != nil {
		return nil, err
	}

	devices, err := srv.back.ListAccountDevices(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*accounts.Account, len(accs))

	for i, a := range accs {
		aid := cid.NewCidV1(uint64(a.AccountsCodec), a.AccountsMultihash)
		devs := devices[AccID(aid)]
		acc := &accounts.Account{
			Id: aid.String(),
			Profile: &accounts.Profile{
				Email: a.AccountsEmail,
				Bio:   a.AccountsBio,
				Alias: a.AccountsAlias,
			},
			Devices: make(map[string]*accounts.Device, len(devs)),
		}
		for _, d := range devs {
			acc.Devices[d.String()] = &accounts.Device{
				PeerId: d.String(),
			}
		}

		out[i] = acc
	}

	return &accounts.ListAccountsResponse{
		Accounts: out,
	}, nil
}
