package accounts

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"mintter/backend/core"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/mttacc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"

	"github.com/ipfs/go-cid"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

// Profile is exposed for convenience.
type Profile = accounts.Profile

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

	perma, err := vcs.EncodePermanode(mttacc.NewAccountPermanode(aid))
	if err != nil {
		return nil, err
	}

	oid := perma.ID

	conn, release, err := srv.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var acc *accounts.Account
	if err := conn.WithTx(false, func() error {
		lid := conn.LookupPermanode(oid)
		if lid == 0 {
			return fmt.Errorf("failed to lookup account permanode for account %s", aid.String())
		}
		acc, err = srv.getAccount(conn, oid, lid)
		return err
	}); err != nil {
		return nil, err
	}

	return acc, nil
}

func (srv *Server) getAccount(conn *vcsdb.Conn, obj cid.Cid, oid vcsdb.LocalID) (*accounts.Account, error) {
	acc := &accounts.Account{
		Id:      conn.GetObjectOwner(oid).String(),
		Profile: &accounts.Profile{},
		Devices: make(map[string]*accounts.Device),
	}

	conn.IterateChanges(obj, false, nil, func(vc vcs.VerifiedChange) error {
		// check if kind profile
		switch vc.Decoded.Kind {
		case vcsdb.KindProfile:
			if err := (proto.UnmarshalOptions{Merge: true}).Unmarshal(vc.Decoded.Body, acc.Profile); err != nil {
				return fmt.Errorf("failed to unmarshal profile update change: %w", err)
			}
		case vcsdb.KindRegistration:
			_ = mttacc.RegistrationProof(vc.Decoded.Body)
			// TODO(burdiyan): verify proof.
			devid := vc.Decoded.Signer.String()
			acc.Devices[devid] = &accounts.Device{PeerId: devid}
		default:
			return fmt.Errorf("unknown change kind for account object: %s", vc.Decoded.Kind)
		}

		return nil
	})

	return acc, nil
}

// UpdateProfile implements the corresponding gRPC method.
func (srv *Server) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	if err := UpdateProfile(ctx, me, srv.vcsdb, in); err != nil {
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

	perma, err := vcs.EncodePermanode(mttacc.NewAccountPermanode(me.AccountID()))
	if err != nil {
		return nil, err
	}

	if err := conn.WithTx(false, func() error {
		accs, err := vcssql.PermanodesListByType(conn.InternalConn(), string(mttacc.AccountType))
		if err != nil {
			return err
		}
		myAcc := conn.LookupPermanode(perma.ID)

		resp.Accounts = make([]*accounts.Account, 0, len(accs))

		for _, a := range accs {
			if vcsdb.LocalID(a.PermanodesID) == myAcc {
				continue
			}

			obj := cid.NewCidV1(uint64(a.PermanodeCodec), a.PermanodeMultihash)

			acc, err := srv.getAccount(conn, obj, vcsdb.LocalID(a.PermanodesID))
			if err != nil {
				return err
			}
			resp.Accounts = append(resp.Accounts, acc)
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

// UpdateProfile is exposed because it's needed to update the site info. This is very bad
// and should not be this way. TODO(burdiyan): get rid of this!
func UpdateProfile(ctx context.Context, me core.Identity, db *vcsdb.DB, in *accounts.Profile) error {
	aid := me.AccountID()

	perma, err := vcs.EncodePermanode(mttacc.NewAccountPermanode(aid))
	if err != nil {
		return err
	}

	obj := perma.ID

	conn, release, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	errNoUpdate := errors.New("nothing to update")

	old := &accounts.Profile{}

	clock := hlc.NewClock()
	var heads []cid.Cid
	if err := conn.WithTx(false, func() error {
		heads, err = conn.GetHeads(obj, true)
		if err != nil {
			return err
		}

		for _, h := range heads {
			ts, err := conn.GetChangeTimestamp(h)
			if err != nil {
				return err
			}
			clock.Track(hlc.Unpack(ts))
		}

		conn.IterateChanges(obj, false, nil, func(vc vcs.VerifiedChange) error {
			if vc.Decoded.Kind != vcsdb.KindProfile {
				return nil
			}
			if err := (proto.UnmarshalOptions{Merge: true}).Unmarshal(vc.Decoded.Body, old); err != nil {
				return fmt.Errorf("unable to unmarshal profile change %s: %w", vc.Cid(), err)
			}
			return nil
		})
		return nil
	}); err != nil && !errors.Is(err, errNoUpdate) {
		return err
	}

	// Nothing to update.
	if proto.Equal(old, in) {
		return nil
	}

	data, err := proto.Marshal(in)
	if err != nil {
		return fmt.Errorf("failed to marshal profile update: %w", err)
	}

	ch := vcs.NewChange(me, obj, heads, vcsdb.KindProfile, clock.Now(), data)
	newvc, err := ch.Block()
	if err != nil {
		return err
	}
	conn.StoreChange(newvc)
	if err := conn.Err(); err != nil {
		return fmt.Errorf("failed to store profile update change: %w", err)
	}

	return conn.Err()
}
