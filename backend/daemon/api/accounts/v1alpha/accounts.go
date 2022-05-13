package accounts

import (
	context "context"
	"fmt"
	"mintter/backend/core"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"
	"mintter/backend/vcs/vcstypes"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
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
	me  *future.ReadOnly[core.Identity]
	vcs *vcs.SQLite
	db  *sqlitex.Pool
}

func NewServer(id *future.ReadOnly[core.Identity], v *vcs.SQLite) *Server {
	return &Server{
		me:  id,
		vcs: v,
		db:  v.DB(),
	}
}

func (srv *Server) GetAccount(ctx context.Context, in *accounts.GetAccountRequest) (*accounts.Account, error) {
	if srv == nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}

	var aid cid.Cid
	if in.Id == "" {
		me, err := srv.getMe()
		if err != nil {
			return nil, err
		}
		aid = me.AccountID()
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
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}
	aid := me.AccountID()

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

		recorded, err := srv.vcs.RecordChange(ctx, acc.ObjectID(), me, acc.ver, "mintter.Account", data)
		if err != nil {
			return nil, fmt.Errorf("failed to record account change: %w", err)
		}

		ver := vcs.NewVersion(recorded.LamportTime, recorded.ID)

		if err := srv.vcs.StoreNamedVersion(ctx, recorded.Object, me, "main", ver); err != nil {
			return nil, fmt.Errorf("failed to store new account version: %w", err)
		}

		// TODO: index account table
	}

	return accountToProto(acc.Account), nil
}

func (srv *Server) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	conn, release, err := srv.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	accs, err := srv.listAccounts(conn)
	if err != nil {
		return nil, err
	}

	devices, err := vcssql.ListAccountDevices(conn)
	if err != nil {
		return nil, err
	}

	out := make([]*accounts.Account, len(accs))

	for i, a := range accs {
		aid := cid.NewCidV1(uint64(a.AccountsCodec), a.AccountsMultihash)
		devs := devices[aid]
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

func (srv *Server) listAccounts(conn *sqlite.Conn) ([]vcssql.AccountsListResult, error) {
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	return vcssql.AccountsList(conn, me.AccountID().Hash())
}

type account struct {
	*vcstypes.Account
	ver vcs.Version
}

func (srv *Server) getMe() (core.Identity, error) {
	me, ok := srv.me.Get()
	if !ok {
		return core.Identity{}, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}
	return me, nil
}

func (srv *Server) getAccount(ctx context.Context, aid cid.Cid) (*account, error) {
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	ap := vcstypes.NewAccountPermanode(aid)

	blk, err := vcs.EncodeBlock(ap)
	if err != nil {
		return nil, err
	}

	ver, err := srv.vcs.LoadNamedVersion(ctx, blk.Cid(), aid, me.DeviceKey().CID(), "main")
	if err != nil {
		return nil, err
	}

	acc := vcstypes.NewAccount(blk.Cid(), aid)

	if err := srv.vcs.IterateChanges(ctx, blk.Cid(), ver, func(rc vcs.RecordedChange) error {
		return acc.ApplyChange(rc.ID, rc.Change)
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
