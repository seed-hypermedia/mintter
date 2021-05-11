package backend

import (
	"context"
	"fmt"

	accounts "mintter/api/go/accounts/v1alpha"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type accountsServer struct {
	repo    *repo
	p2p     p2pNodeFactory
	patches *patchStore
}

func (srv *accountsServer) GetAccount(ctx context.Context, in *accounts.GetAccountRequest) (*accounts.Account, error) {
	if in.Id != "" {
		panic("BUG: not implemented searching other accounts yet")
	}

	acc, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	_, resp, err := srv.accountState(ctx, acc.id)
	if err != nil {
		return nil, fmt.Errorf("failed to hydrate account state: %w", err)
	}

	return resp, nil
}

func (srv *accountsServer) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	acc, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	state, account, err := srv.accountState(ctx, acc.id)
	if err != nil {
		return nil, err
	}

	merged := &accounts.Profile{}
	if account.Profile == nil {
		account.Profile = &accounts.Profile{}
	}
	proto.Merge(merged, account.Profile)
	proto.Merge(merged, in)

	diff := diffProto(account.Profile, merged)
	if diff == nil {
		return account, nil
	}

	evt := &accounts.ProfileUpdated{
		Profile: diff.(*accounts.Profile),
	}

	account.Profile = merged

	sp, err := state.NewProtoPatch(cid.Cid(acc.id), srv.repo.Device().priv, evt)
	if err != nil {
		return nil, fmt.Errorf("failed to produce patch to update profile: %w", err)
	}

	if err := srv.patches.AddPatch(ctx, sp); err != nil {
		return nil, fmt.Errorf("failed to store patch: %w", err)
	}

	return account, nil
}

func (srv *accountsServer) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	return nil, nil
}

func (srv *accountsServer) StartAccountDiscovery(ctx context.Context, in *accounts.StartAccountDiscoveryRequest) (*accounts.StartAccountDiscoveryResponse, error) {
	// Join topic
	// Start looking for peers
	return nil, nil
}

func (srv *accountsServer) accountState(ctx context.Context, id AccountID) (*state, *accounts.Account, error) {
	state, err := srv.patches.LoadState(ctx, cid.Cid(id))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to load state: %w", err)
	}

	if state.size == 0 {
		return nil, nil, fmt.Errorf("no information about account %s", id)
	}

	aid := state.obj.String()

	acc := &accounts.Account{}
	for state.Next() {
		sp := state.Item()
		msg, err := sp.ProtoBody()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal proto body: %w", err)
		}

		switch data := msg.(type) {
		case *accounts.DeviceRegistered:
			if acc.Id == "" {
				acc.Id = aid
			}

			if acc.Id != aid {
				return nil, nil, fmt.Errorf("profile update from unrelated author")
			}

			// TODO: verify proof
			_ = data.Proof
			if acc.Devices == nil {
				acc.Devices = make(map[string]*accounts.Device)
			}
			d, err := srv.getDevice(sp.peer, sp)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to find device %s: %w", sp.peer, err)
			}
			acc.Devices[d.PeerId] = d
		case *accounts.ProfileUpdated:
			if acc.Profile == nil {
				acc.Profile = data.Profile
			} else {
				proto.Merge(acc.Profile, data.Profile)
			}
		}
	}

	return state, acc, nil
}

func (srv *accountsServer) getDevice(c cid.Cid, sp signedPatch) (*accounts.Device, error) {
	return &accounts.Device{
		PeerId:       c.String(),
		RegisterTime: timestamppb.New(sp.CreateTime),
	}, nil
}
