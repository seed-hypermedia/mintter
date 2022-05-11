package backend

import (
	"context"

	"github.com/ipfs/go-cid"

	"mintter/backend/core"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	"mintter/backend/vcs"
)

type accountsAPI struct {
	back *backend

	*accounts.Server
}

func newAccountsAPI(back *backend, v *vcs.SQLite) accounts.AccountsServer {
	srv := &accountsAPI{
		back: back,
	}

	// This is ugly as hell, and racy. It's all mess right now while we're refactoring.
	// The problem here is lazy account initialization. We start up all the things
	// before actually having an account, so lots of things are messy because of that.
	go func() {
		<-back.repo.Ready()
		acc, err := back.Account()
		if err != nil {
			panic(err)
		}

		aid := cid.Cid(acc.CID())

		id := core.NewIdentity(aid, back.repo.Device())

		api := accounts.NewServer(id, v)
		srv.Server = api

	}()

	return srv
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
