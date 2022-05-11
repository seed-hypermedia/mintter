package accounts

import (
	context "context"
	"fmt"
	"mintter/backend/core"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

type (
	AccountsServer       = accounts.AccountsServer
	ListAccountsRequest  = accounts.ListAccountsRequest
	ListAccountsResponse = accounts.ListAccountsResponse
	Account              = accounts.Account
	Device               = accounts.Device
	Profile              = accounts.Profile
)

type Server struct {
	me  core.Identity
	vcs *vcs.SQLite
}

func NewServer(id core.Identity, v *vcs.SQLite) *Server {
	return &Server{
		me:  id,
		vcs: v,
	}
}

func (srv *Server) GetAccount(ctx context.Context, in *accounts.GetAccountRequest) (*accounts.Account, error) {
	if srv == nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}

	var aid cid.Cid
	if in.Id == "" {
		aid = srv.me.AccountID()
	} else {
		acc, err := cid.Decode(in.Id)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "can't decode account id as CID: %v", err)
		}
		aid = acc
	}

	acc, err := srv.getAccount(ctx, aid)
	if err != nil {
		return nil, err
	}

	return accountToProto(acc.Account), nil
}

func (srv *Server) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	aid := srv.me.AccountID()

	acc, err := srv.getAccount(ctx, aid)
	if err != nil {
		return nil, err
	}

	acc.SetAlias(in.Alias)
	acc.SetBio(in.Bio)
	acc.SetEmail(in.Email)

	evts := acc.Events()

	if len(evts) > 0 {
		data, err := cbornode.DumpObject(evts)
		if err != nil {
			return nil, fmt.Errorf("failed to encode account update events: %w", err)
		}

		recorded, err := srv.vcs.RecordChange(ctx, acc.ObjectID(), srv.me, acc.ver, "mintter.Account", data)
		if err != nil {
			return nil, fmt.Errorf("failed to record account change: %w", err)
		}

		ver := vcs.NewVersion(recorded.LamportTime, recorded.ID)

		if err := srv.vcs.StoreNamedVersion(ctx, recorded.Object, srv.me, "main", ver); err != nil {
			return nil, fmt.Errorf("failed to store new account version: %w", err)
		}

		// TODO: index account table
	}

	return accountToProto(acc.Account), nil
}

type account struct {
	*vcstypes.Account
	ver vcs.Version
}

func (srv *Server) getAccount(ctx context.Context, aid cid.Cid) (*account, error) {
	ap := vcstypes.NewAccountPermanode(aid)

	blk, err := vcs.EncodeBlock(ap)
	if err != nil {
		return nil, err
	}

	ver, err := srv.vcs.LoadNamedVersion(ctx, blk.Cid(), aid, srv.me.DeviceKey().CID(), "main")
	if err != nil {
		return nil, err
	}

	acc := vcstypes.NewAccount(blk.Cid(), aid)

	if err := srv.vcs.IterateChanges(ctx, blk.Cid(), ver, func(c vcs.Change) error {
		var evts []vcstypes.AccountEvent
		if err := cbornode.DecodeInto(c.Body, &evts); err != nil {
			return fmt.Errorf("failed to decode account events: %w", err)
		}

		for _, e := range evts {
			if err := acc.Apply(e, c.CreateTime); err != nil {
				return fmt.Errorf("failed to apply account event: %w", err)
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return &account{Account: acc, ver: ver}, nil
}

func accountToProto(acc *vcstypes.Account) *accounts.Account {
	accpb := &accounts.Account{
		Id: acc.State().ID.String(),
		Profile: &accounts.Profile{
			Alias: acc.State().Profile.Alias,
			Bio:   acc.State().Profile.Bio,
			Email: acc.State().Profile.Email,
		},
		Devices: make(map[string]*accounts.Device),
	}

	for did := range acc.State().Devices {
		accpb.Devices[did.String()] = &accounts.Device{
			PeerId: did.String(),
		}
	}

	return accpb
}
