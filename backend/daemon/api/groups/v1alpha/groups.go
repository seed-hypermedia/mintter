// Package groups implements the groups service.
package groups

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"mintter/backend/core"
	groups "mintter/backend/genproto/groups/v1alpha"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet"
	"mintter/backend/mttnet/sitesql"
	"mintter/backend/pkg/errutil"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/maputil"
	"strings"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multibase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Server is the implementation of the groups service.
type Server struct {
	me    *future.ReadOnly[core.Identity]
	blobs *hyper.Storage
	node  *future.ReadOnly[*mttnet.Node]
}

// NewServer creates a new groups server.
func NewServer(me *future.ReadOnly[core.Identity], blobs *hyper.Storage, node *future.ReadOnly[*mttnet.Node]) *Server {
	return &Server{
		me:    me,
		blobs: blobs,
		node:  node,
	}
}

// CreateGroup creates a new group.
func (srv *Server) CreateGroup(ctx context.Context, in *groups.CreateGroupRequest) (*groups.Group, error) {
	if in.Title == "" {
		return nil, errutil.MissingArgument("title")
	}

	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	id, nonce := newID(me.Account().Principal())
	eid := hyper.EntityID("hd://g/" + id)

	patch := map[string]any{
		"nonce": nonce,
		"title": in.Title,
		"owner": me.Account().Principal(),
	}
	if in.Description != "" {
		patch["description"] = in.Description
	}

	if in.Members != nil {
		// TODO(burdiyan): validate members are valid account IDs.
		patch["members"] = in.Members
	}

	del, err := srv.getDelegation(ctx)
	if err != nil {
		return nil, err
	}
	e := hyper.NewEntity(eid)
	hb, err := e.CreateChange(e.NextTimestamp(), me.DeviceKey(), del, patch)
	if err != nil {
		return nil, err
	}

	if err := srv.blobs.SaveBlob(ctx, hb); err != nil {
		return nil, err
	}

	return groupToProto(e, true)
}

// GetGroup gets a group.
func (srv *Server) GetGroup(ctx context.Context, in *groups.GetGroupRequest) (*groups.Group, error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	eid := hyper.EntityID(in.Id)

	var e *hyper.Entity
	if in.Version == "" {
		v, err := srv.blobs.LoadEntity(ctx, eid)
		if err != nil {
			return nil, err
		}
		e = v
	} else {
		heads, err := hyper.Version(in.Version).Parse()
		if err != nil {
			return nil, err
		}

		v, err := srv.blobs.LoadEntityFromHeads(ctx, eid, heads...)
		if err != nil {
			return nil, err
		}
		e = v
	}

	return groupToProto(e, true)
}

// UpdateGroup updates a group.
func (srv *Server) UpdateGroup(ctx context.Context, in *groups.UpdateGroupRequest) (*groups.Group, error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	if in.UpdatedMembers != nil {
		return nil, status.Errorf(codes.Unimplemented, "TODO: updating members is not implemented yet")
	}

	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	eid := hyper.EntityID(in.Id)
	e, err := srv.blobs.LoadEntity(ctx, eid)
	if err != nil {
		return nil, err
	}

	patch := map[string]any{}

	if in.Title != "" {
		v, ok := e.Get("title")
		if !ok {
			return nil, fmt.Errorf("all groups must have title")
		}

		if v.(string) != in.Title {
			patch["title"] = in.Title
		}
	}

	{
		old, ok := e.Get("description")
		if !ok || old.(string) != in.Description {
			patch["description"] = in.Description
		}
	}

	for k, v := range in.UpdatedContent {
		oldv, ok := e.Get("content", k)
		if !ok || oldv.(string) != v {
			maputil.Set(patch, []string{"content", k}, v)
		}
	}

	del, err := srv.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	hb, err := e.CreateChange(e.NextTimestamp(), me.DeviceKey(), del, patch)
	if err != nil {
		return nil, err
	}

	if err := srv.blobs.SaveBlob(ctx, hb); err != nil {
		return nil, err
	}

	return groupToProto(e, true)
}

// ListGroups lists groups.
func (srv *Server) ListGroups(ctx context.Context, in *groups.ListGroupsRequest) (*groups.ListGroupsResponse, error) {
	entities, err := srv.blobs.ListEntities(ctx, "hd://g/")
	if err != nil {
		return nil, err
	}

	resp := &groups.ListGroupsResponse{
		Groups: make([]*groups.Group, 0, len(entities)),
	}

	for _, e := range entities {
		pub, err := srv.GetGroup(ctx, &groups.GetGroupRequest{
			Id: string(e),
		})
		if err != nil {
			continue
		}
		resp.Groups = append(resp.Groups, pub)
	}

	return resp, nil
}

// ListContent lists content of a group.
func (srv *Server) ListContent(ctx context.Context, in *groups.ListContentRequest) (*groups.ListContentResponse, error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	eid := hyper.EntityID(in.Id)

	var e *hyper.Entity
	if in.Version == "" {
		v, err := srv.blobs.LoadEntity(ctx, eid)
		if err != nil {
			return nil, err
		}
		e = v
	} else {
		heads, err := hyper.Version(in.Version).Parse()
		if err != nil {
			return nil, err
		}

		v, err := srv.blobs.LoadEntityFromHeads(ctx, eid, heads...)
		if err != nil {
			return nil, err
		}
		e = v
	}

	paths := e.State().Keys("content")

	out := &groups.ListContentResponse{
		Content: make(map[string]string, len(paths)),
	}

	for _, p := range paths {
		v, ok := e.Get("content", p)
		if !ok {
			panic("BUG: no content for key " + p)
		}

		out.Content[p] = v.(string)
	}

	return out, nil
}

// ListMembers lists members of a group.
func (srv *Server) ListMembers(ctx context.Context, in *groups.ListMembersRequest) (*groups.ListMembersResponse, error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	eid := hyper.EntityID(in.Id)

	var e *hyper.Entity
	if in.Version == "" {
		v, err := srv.blobs.LoadEntity(ctx, eid)
		if err != nil {
			return nil, err
		}
		e = v
	} else {
		heads, err := hyper.Version(in.Version).Parse()
		if err != nil {
			return nil, err
		}

		v, err := srv.blobs.LoadEntityFromHeads(ctx, eid, heads...)
		if err != nil {
			return nil, err
		}
		e = v
	}

	o, ok := e.Get("owner")
	if !ok {
		return nil, fmt.Errorf("group entity must have owner")
	}

	return &groups.ListMembersResponse{
		OwnerAccountId: core.Principal(o.([]byte)).String(),
	}, nil
}

// GetSiteInfo gets information of a local site.
func (srv *Server) GetSiteInfo(ctx context.Context, in *groups.GetSiteInfoRequest) (*groups.GetSiteInfoResponse, error) {
	ret := &groups.GetSiteInfoResponse{}
	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		res, err := sitesql.GetSiteInfo(conn, in.Hostname)
		if err != nil {
			return fmt.Errorf("No site info available: %w", err)
		}
		ret.GroupId = res.HDEntitiesEID
		if res.ServedSitesVersion != "" {
			ret.Version = res.ServedSitesVersion
		} else {
			entity, err := srv.blobs.LoadEntity(ctx, hyper.EntityID(res.HDEntitiesEID))
			if err != nil {
				return fmt.Errorf("could not get entity [%s]: %w", res.HDEntitiesEID, err)
			}
			ret.Version = entity.Version().String()
		}

		ret.OwnerId = core.Principal(res.PublicKeysPrincipal).String()
		return nil
	}); err != nil {
		return nil, err
	}
	return ret, nil
}

// ConvertToSite converts a group into a site. P2P group will still work as usual after this call.
func (srv *Server) ConvertToSite(ctx context.Context, in *groups.ConvertToSiteRequest) (*groups.ConvertToSiteResponse, error) {
	n, ok := srv.node.Get()
	if !ok {
		return nil, fmt.Errorf("node not ready yet")
	}

	remoteHostname := strings.Split(in.Link, "/secret-invite/")[0]

	info, err := mttnet.GetSiteAddressFromHeaders(remoteHostname)
	if err != nil {
		return nil, fmt.Errorf("Could not get site [%s] info via http: %w", remoteHostname, err)
	}

	if err := n.Connect(ctx, info); err != nil {
		return nil, fmt.Errorf("failed to connect to site [%s] with peer info [%s]: %w", remoteHostname, info.String(), err)
	}
	client, err := n.Client(ctx, info.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get a p2p client with node [%s]: %w", info.ID.String(), err)
	}
	res, err := client.CreateSite(ctx, &p2p.CreateSiteRequest{
		Link:    in.Link,
		GroupId: in.GroupId,
		Version: in.Version,
	})
	if err != nil {
		return nil, fmt.Errorf("Failed to create a remote site: %w", err)
	}

	return &groups.ConvertToSiteResponse{
		OwnerId:  res.OwnerId,
		Hostname: remoteHostname,
	}, nil

}
func groupToProto(e *hyper.Entity, isLatest bool) (*groups.Group, error) {
	createTime := e.AppliedChanges()[0].Data.HLCTime.Time()

	gpb := &groups.Group{
		Id:         string(e.ID()),
		CreateTime: timestamppb.New(createTime),
		Version:    e.Version().String(),
	}

	{
		v, ok := e.Get("owner")
		if !ok {
			return nil, fmt.Errorf("group entity must have owner")
		}

		switch v := v.(type) {
		case core.Principal:
			gpb.OwnerAccountId = v.String()
		case []byte:
			gpb.OwnerAccountId = core.Principal(v).String()
		}
	}

	{
		v, ok := e.Get("title")
		if !ok {
			return nil, fmt.Errorf("group entity must have title")
		}
		gpb.Title = v.(string)
	}

	{
		v, ok := e.Get("description")
		if ok {
			gpb.Description = v.(string)
		}
	}

	return gpb, nil
}

func (srv *Server) getMe() (core.Identity, error) {
	me, ok := srv.me.Get()
	if !ok {
		return core.Identity{}, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}
	return me, nil
}

func (srv *Server) getDelegation(ctx context.Context) (cid.Cid, error) {
	me, err := srv.getMe()
	if err != nil {
		return cid.Undef, err
	}

	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := me.Account().Principal()
		dev := me.DeviceKey().Principal()

		list, err := hypersql.KeyDelegationsList(conn, acc)
		if err != nil {
			return err
		}

		for _, res := range list {
			if bytes.Equal(dev, res.KeyDelegationsViewDelegate) {
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

func newID(me core.Principal) (id string, nonce []byte) {
	nonce = make([]byte, 16)
	_, err := rand.Read(nonce)
	if err != nil {
		panic(err)
	}

	h := sha256.New()
	if _, err := h.Write(me); err != nil {
		panic(err)
	}
	if _, err := h.Write(nonce); err != nil {
		panic(err)
	}

	dig := h.Sum(nil)
	base, err := multibase.Encode(multibase.Base58BTC, dig)
	if err != nil {
		panic(err)
	}

	// Using last 22 characters to avoid multibase prefix.
	// We don't use full hash digest here, to make our IDs shorter.
	// But it should have enough collision resistance for our purpose.
	return base[len(base)-22:], nonce
}
