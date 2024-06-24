// Package accounts implements account functions.
package accounts

import (
	"bytes"
	"context"
	"fmt"
	"regexp"
	"seed/backend/core"
	accounts "seed/backend/genproto/accounts/v1alpha"
	"seed/backend/hyper"
	"seed/backend/hyper/hypersql"
	"strings"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Profile is exposed for convenience.
type Profile = accounts.Profile

// Server implement the accounts gRPC server.
type Server struct {
	keys  core.KeyStore
	blobs *hyper.Storage
}

// NewServer creates a new Server.
func NewServer(ks core.KeyStore, blobs *hyper.Storage) *Server {
	return &Server{
		keys:  ks,
		blobs: blobs,
	}
}

// RegisterServer registers the server with the gRPC server.
func (srv *Server) RegisterServer(rpc grpc.ServiceRegistrar) {
	accounts.RegisterAccountsServer(rpc, srv)
}

// GetAccount implements the corresponding gRPC method.
func (srv *Server) GetAccount(ctx context.Context, in *accounts.GetAccountRequest) (*accounts.Account, error) {
	if srv == nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}

	var aid core.Principal
	if in.Id == "" {
		me, err := srv.keys.GetKey(ctx, "main")
		if err != nil {
			return nil, err
		}
		aid = me.Principal()
	} else {
		p, err := core.DecodePrincipal(in.Id)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "can't decode Account ID: %v", err)
		}
		aid = p
	}

	aids := aid.String()

	acc := &accounts.Account{
		Id:      aids,
		Profile: &accounts.Profile{},
		Devices: make(map[string]*accounts.Device),
	}

	// Load devices for this account.
	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		list, err := hypersql.KeyDelegationsList(conn, aid)
		if err != nil {
			return err
		}

		for _, res := range list {
			del := core.Principal(res.KeyDelegationsViewDelegate)
			pid, err := del.PeerID()
			if err != nil {
				return err
			}
			pids := pid.String()
			acc.Devices[pids] = &accounts.Device{
				DeviceId: pids,
			}
		}
		istrusted, err := hypersql.IsTrustedAccount(conn, aid)
		if err != nil {
			return err
		}
		if istrusted.TrustedAccountsID != 0 {
			acc.IsTrusted = true
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if len(acc.Devices) == 0 {
		return nil, status.Errorf(codes.NotFound, "account %s not found", aids)
	}

	entity, err := srv.blobs.LoadEntity(ctx, hyper.EntityID("hm://a/"+aids))
	if err != nil {
		return nil, err
	}
	if entity == nil {
		return acc, nil
	}

	v, ok := entity.Get("alias")
	if ok {
		acc.Profile.Alias = v.(string)
	}

	v, ok = entity.Get("bio")
	if ok {
		acc.Profile.Bio = v.(string)
	}

	v, ok = entity.Get("avatar")
	if ok {
		acc.Profile.Avatar = v.(cid.Cid).String()
	}

	v, ok = entity.Get("rootDocument")
	if ok {
		acc.Profile.RootDocument = v.(string)
	}

	return acc, nil
}

func getDelegation(ctx context.Context, account, device core.Principal, blobs *hyper.Storage) (cid.Cid, error) {
	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := blobs.Query(ctx, func(conn *sqlite.Conn) error {
		list, err := hypersql.KeyDelegationsList(conn, account)
		if err != nil {
			return err
		}

		for _, res := range list {
			if bytes.Equal(device, res.KeyDelegationsViewDelegate) {
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobMultihash)
				return nil
			}
		}

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return out, fmt.Errorf("BUG: failed to find our own key delegation")
	}

	return out, nil
}

// UpdateProfile implements the corresponding gRPC method.
func (srv *Server) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	if err := UpdateProfile(ctx, me, srv.blobs, in); err != nil {
		return nil, err
	}

	return srv.GetAccount(ctx, &accounts.GetAccountRequest{})
}

var rootDocMatch = regexp.MustCompile(`^hm:\/\/d\/[a-zA-Z0-9]+$`)

// UpdateProfile is public so it can be called from sites.
func UpdateProfile(ctx context.Context, me core.KeyPair, blobs *hyper.Storage, in *accounts.Profile) error {
	eid := hyper.EntityID("hm://a/" + me.Principal().String())

	e, err := blobs.LoadEntity(ctx, eid)
	if err != nil {
		return err
	}
	// The first profile update won't have any changes yet for the entity.
	if e == nil {
		e = hyper.NewEntity(eid)
	}

	patch := map[string]any{}

	in.Alias = strings.TrimSpace(in.Alias)
	in.Bio = strings.TrimSpace(in.Bio)

	v, ok := e.Get("alias")
	if (ok && v.(string) != in.Alias) || (!ok && in.Alias != "") {
		patch["alias"] = in.Alias
	}

	v, ok = e.Get("bio")
	if (ok && v.(string) != in.Bio) || (!ok && in.Bio != "") {
		patch["bio"] = in.Bio
	}

	v, ok = e.Get("avatar")
	vcid, iscid := v.(cid.Cid)
	isnil := v == nil
	switch {
	case in.Avatar == "" && ok && !isnil:
		patch["avatar"] = nil
	case in.Avatar != "":
		avatar, err := cid.Decode(in.Avatar)
		if err != nil {
			return status.Errorf(codes.InvalidArgument, "failed to decode avatar %s as CID: %v", in.Avatar, err)
		}

		if iscid && vcid.Equals(avatar) {
			break
		}

		patch["avatar"] = avatar
	}

	v, ok = e.Get("rootDocument")
	if (ok && v.(string) != in.RootDocument) || (!ok && in.RootDocument != "") {
		if in.RootDocument != "" && !rootDocMatch.MatchString(in.RootDocument) {
			return status.Errorf(codes.InvalidArgument, "root document must be ID of a document entity in form of 'hm://d/<id>' got: %s", in.RootDocument)
		}

		patch["rootDocument"] = in.RootDocument
	}

	if len(patch) == 0 {
		return nil
	}

	del, err := getDelegation(ctx, me.Principal(), me.Principal(), blobs)
	if err != nil {
		return err
	}

	change, err := e.CreateChange(e.NextTimestamp(), me, del, patch)
	if err != nil {
		return err
	}

	if err := blobs.SaveBlob(ctx, change); err != nil {
		return fmt.Errorf("failed to save account update change: %w", err)
	}

	return nil
}

// SetAccountTrust implements the corresponding gRPC method.
func (srv *Server) SetAccountTrust(ctx context.Context, in *accounts.SetAccountTrustRequest) (*accounts.Account, error) {
	panic("TODO: remove account trust as we are getting rid of it")
}

// ListAccounts implements the corresponding gRPC method.
func (srv *Server) ListAccounts(ctx context.Context, in *accounts.ListAccountsRequest) (*accounts.ListAccountsResponse, error) {
	entities, err := srv.blobs.ListEntities(ctx, "hm://a/*")
	if err != nil {
		return nil, err
	}

	resp := &accounts.ListAccountsResponse{
		Accounts: make([]*accounts.Account, 0, len(entities)),
	}

	for _, e := range entities {
		draft, err := srv.GetAccount(ctx, &accounts.GetAccountRequest{
			Id: e.TrimPrefix("hm://a/"),
		})
		if err != nil {
			continue
		}
		resp.Accounts = append(resp.Accounts, draft)
	}

	return resp, nil
}

func (srv *Server) getMe() (core.KeyPair, error) {
	kp, err := srv.keys.GetKey(context.Background(), "main")
	if err != nil {
		return core.KeyPair{}, status.Errorf(codes.FailedPrecondition, "account is not initialized yet: %v", err)
	}
	return kp, nil
}
