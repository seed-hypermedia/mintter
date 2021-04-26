package backend

import (
	"context"
	"fmt"

	accounts "mintter/api/go/accounts/v1alpha"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/proto"
)

type accountsServer struct {
	repo    *repo
	p2p     lazyP2PNode
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

	state, err := srv.patches.LoadState(ctx, cid.Cid(acc.id))
	if err != nil {
		return nil, fmt.Errorf("failed to load state: %w", err)
	}

	if state.size == 0 {
		return nil, fmt.Errorf("no information about account %s", in.Id)
	}

	resp := &accounts.Account{}
	for state.Next() {
		sp := state.Item()
		if sp.Kind != PatchKindAccountEvent {
			return nil, fmt.Errorf("unknown patch kind %s", sp.Kind)
		}

		evt := &accounts.AccountEvent{}
		if err := proto.Unmarshal(sp.Body, evt); err != nil {
			return nil, fmt.Errorf("failed to unmarshal proto: %w", err)
		}

		author := sp.Author.String()

		switch data := evt.GetData().(type) {
		case *accounts.AccountEvent_DeviceRegistered:
			if resp.Id == "" {
				resp.Id = author
			}

			if resp.Id != author {
				return nil, fmt.Errorf("profile update from unrelated author")
			}

			// TODO: verify proof
			_ = data.DeviceRegistered.Proof
			if resp.Devices == nil {
				resp.Devices = make(map[string]*accounts.Device)
			}
			resp.Devices[sp.peer.String()] = &accounts.Device{}

		case *accounts.AccountEvent_ProfiledUpdated:
			// TODO
		}
	}

	return resp, nil
}

func (srv *accountsServer) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	return nil, nil
}
