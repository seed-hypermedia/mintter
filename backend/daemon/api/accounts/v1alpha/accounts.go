package accounts

import (
	"context"
	"errors"
	"sort"
	"time"

	"mintter/backend/core"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs/mttacc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"

	"github.com/ipfs/go-cid"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// Server implement the accounts gRPC server.
type Server struct {
	me    *future.ReadOnly[core.Identity]
	vcsdb *vcsdb.DB
}

// NewServer creates a new Server.
func NewServer(id *future.ReadOnly[core.Identity], vcs *vcsdb.DB) *Server {
	return &Server{
		me:    id,
		vcsdb: vcs,
	}
}

// GetAccount implements the corresponding gRPC method.
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

	perma, err := vcsdb.NewPermanode(mttacc.NewAccountPermanode(aid))
	if err != nil {
		return nil, err
	}

	oid := perma.ID

	me, err := srv.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := srv.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var acc *accounts.Account

	if err := conn.WithTx(false, func() error {
		obj := conn.LookupPermanode(oid)
		meLocal := conn.LookupIdentity(me)
		version := conn.GetVersion(obj, "main", meLocal)
		cs := conn.ResolveChangeSet(obj, version)

		acc = srv.getAccount(conn, obj, cs)

		return nil
	}); err != nil {
		return nil, err
	}

	return acc, nil
}

func (srv *Server) getAccount(conn *vcsdb.Conn, obj vcsdb.LocalID, cs vcsdb.ChangeSet) *accounts.Account {
	acc := &accounts.Account{
		Id:      conn.GetObjectOwner(obj).String(),
		Profile: &accounts.Profile{},
		Devices: make(map[string]*accounts.Device),
	}

	if alias := conn.QueryLastValue(obj, cs, vcsdb.RootNode, mttacc.AttrAlias); !alias.IsZero() {
		acc.Profile.Alias = alias.Value.(string)
	}
	if bio := conn.QueryLastValue(obj, cs, vcsdb.RootNode, mttacc.AttrBio); !bio.IsZero() {
		acc.Profile.Bio = bio.Value.(string)
	}
	if email := conn.QueryLastValue(obj, cs, vcsdb.RootNode, mttacc.AttrEmail); !email.IsZero() {
		acc.Profile.Email = email.Value.(string)
	}

	regs := conn.QueryValuesByAttr(obj, cs, vcsdb.RootNode, mttacc.AttrRegistration)
	for regs.Next() {
		d := conn.QueryLastValue(obj, cs, regs.Item().ValueAny().(vcsdb.NodeID), mttacc.AttrDevice)
		if d.IsZero() {
			panic("BUG: registration without a device")
		}

		did := d.Value.(cid.Cid).String()

		acc.Devices[did] = &accounts.Device{
			PeerId: did,
		}
	}
	if regs.Err() != nil {
		panic(regs.Err())
	}

	return acc
}

// UpdateProfile implements the corresponding gRPC method.
func (srv *Server) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}
	aid := me.AccountID()

	perma, err := vcsdb.NewPermanode(mttacc.NewAccountPermanode(aid))
	if err != nil {
		return nil, err
	}

	conn, release, err := srv.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	errNoUpdate := errors.New("nothing to update")

	if err := conn.WithTx(true, func() error {
		obj := conn.LookupPermanode(perma.ID)
		meLocal := conn.EnsureIdentity(me)
		version := conn.GetVersion(obj, "main", meLocal)
		cs := conn.ResolveChangeSet(obj, version)
		change := conn.NewChange(obj, meLocal, version, time.Now().UTC())
		newDatom := vcsdb.MakeDatomFactory(change, conn.GetChangeLamportTime(change), 0)

		email := conn.QueryLastValue(obj, cs, vcsdb.RootNode, mttacc.AttrEmail)
		alias := conn.QueryLastValue(obj, cs, vcsdb.RootNode, mttacc.AttrAlias)
		bio := conn.QueryLastValue(obj, cs, vcsdb.RootNode, mttacc.AttrBio)

		var dirty bool

		if email.IsZero() || email.Value.(string) != in.Email {
			dirty = true
			conn.AddDatom(obj, newDatom(vcsdb.RootNode, mttacc.AttrEmail, in.Email))
		}

		if alias.IsZero() || alias.Value.(string) != in.Alias {
			dirty = true
			conn.AddDatom(obj, newDatom(vcsdb.RootNode, mttacc.AttrAlias, in.Alias))
		}

		if bio.IsZero() || bio.Value.(string) != in.Bio {
			dirty = true
			conn.AddDatom(obj, newDatom(vcsdb.RootNode, mttacc.AttrBio, in.Bio))
		}

		if !dirty {
			return errNoUpdate
		}

		conn.SaveVersion(obj, "main", meLocal, vcsdb.LocalVersion{change})
		conn.EncodeChange(change, me.DeviceKey())

		return nil
	}); err != nil && !errors.Is(err, errNoUpdate) {
		return nil, err
	}

	return srv.GetAccount(ctx, &accounts.GetAccountRequest{
		Id: me.AccountID().String(),
	})
}

// ListAccounts implements the corresponding gRPC method.
func (srv *Server) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	conn, release, err := srv.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	resp := &accounts.ListAccountsResponse{}

	perma, err := vcsdb.NewPermanode(mttacc.NewAccountPermanode(me.AccountID()))
	if err != nil {
		return nil, err
	}

	if err := conn.WithTx(false, func() error {
		accs := conn.ListObjectsByType(mttacc.AccountType)
		meLocal := conn.LookupIdentity(me)
		myAcc := conn.LookupPermanode(perma.ID)

		resp.Accounts = make([]*accounts.Account, 0, len(accs))

		for _, a := range accs {
			if a == myAcc {
				continue
			}
			v := conn.GetVersion(a, "main", meLocal)
			cs := conn.ResolveChangeSet(a, v)
			resp.Accounts = append(resp.Accounts, srv.getAccount(conn, a, cs))
		}

		return nil
	}); err != nil {
		return nil, err
	}

	// This is a hack to make tests pass. When we first connect to a peer,
	// we won't immediately sync their account object, but we want them in the list
	// of accounts here. So we do the additional scan using another database table
	// to stick those pending accounts into the response.
	//
	// TODO(burdiyan): this is ugly as hell. Remove this in build11.
	res, err := vcssql.AccountDevicesList(conn.InternalConn())
	if err != nil {
		return nil, err
	}

	meacc := me.Account().CID().String()

	for _, r := range res {
		acc := cid.NewCidV1(core.CodecAccountKey, r.AccountsMultihash).String()
		did := cid.NewCidV1(core.CodecDeviceKey, r.DevicesMultihash).String()

		if acc == meacc {
			continue
		}

		idx := -1
		for i, ra := range resp.Accounts {
			if ra.Id == acc {
				idx = i
				break
			}
		}

		if idx == -1 {
			resp.Accounts = append(resp.Accounts, &accounts.Account{
				Id:      acc,
				Profile: &accounts.Profile{},
				Devices: map[string]*accounts.Device{
					did: {
						PeerId: did,
					},
				},
			})
		} else {
			ra := resp.Accounts[idx]
			if _, ok := ra.Devices[did]; ok {
				continue
			}
			ra.Devices[did] = &accounts.Device{
				PeerId: did,
			}
		}
	}

	sort.Slice(resp.Accounts, func(i, j int) bool {
		return resp.Accounts[i].Id < resp.Accounts[j].Id
	})

	return resp, nil
}

func (srv *Server) getMe() (core.Identity, error) {
	me, ok := srv.me.Get()
	if !ok {
		return core.Identity{}, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}
	return me, nil
}
