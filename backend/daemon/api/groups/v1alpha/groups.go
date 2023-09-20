// Package groups implements the groups service.
package groups

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mintter/backend/core"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hlc"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/dqb"
	"mintter/backend/pkg/errutil"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/maputil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Server is the implementation of the groups service.
type Server struct {
	me    *future.ReadOnly[core.Identity]
	blobs *hyper.Storage
	db    *DB
	node  *future.ReadOnly[*mttnet.Node]
}

// NewServer creates a new groups server.
func NewServer(me *future.ReadOnly[core.Identity], db *DB, blobs *hyper.Storage, node *future.ReadOnly[*mttnet.Node]) *Server {
	return &Server{
		me:    me,
		db:    db,
		blobs: blobs,
		node:  node,
	}
}

// StartPeriodicSync starts periodic sync of sites.
// It will block until the provided context is canceled.
func (srv *Server) StartPeriodicSync(ctx context.Context, warmup, interval time.Duration) error {
	t := time.NewTimer(warmup)
	defer t.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:

			t.Reset(interval)
		}
	}
}

var qGetSite = dqb.Str(`
	SELECT
		url,
		peer_id,
		group_id,
		group_version,
		last_sync_time,
		last_ok_sync_time
	FROM remote_sites
	WHERE url = :url;
`)

func (srv *Server) syncSite(ctx context.Context, siteURL string, interval time.Duration) error {
	var (
		url            string
		peerID         string
		groupID        string
		groupVersion   string
		lastSyncTime   int64
		lastSyncOkTime int64
	)
	if err := srv.db.QueryOne(ctx, qGetSite(),
		[]any{siteURL},
		[]any{&url, &peerID, &groupID, &groupVersion, &lastSyncTime, &lastSyncOkTime},
	); err != nil {
		return err
	}

	now := time.Now()
	lastSync := time.Unix(lastSyncTime, 0)

	if now.Sub(lastSync) < interval {
		return nil
	}

	info, err := GetSiteInfoHTTP(ctx, nil, siteURL)
	if err != nil {
		return fmt.Errorf("failed to get site info: %w", err)
	}

	if info.GroupId != groupID {
		return fmt.Errorf("group ID mismatch: remote %s != local %s", info.GroupId, groupID)
	}

	if info.GroupVersion == groupVersion {
		return nil
	}

	// otherwise do the sync
	//   get remote info
	//      check remote group id correspond with the local one
	// 		get all blobs from site
	//      push all blobs to site
	//   get remote version and check if we have heads. If so => skip
	//   sync with site
	//

	// TODO: record sync time in db
	// if we don't have version heads - sync everything
	//

	// n, err := srv.node.Await(ctx)
	// if err != nil {
	// 	return err
	// }

	// ai, err := addrInfoFromProto(info.PeerInfo)
	// if err != nil {
	// 	return fmt.Errorf("failed to parse peer info: %w", err)
	// }

	// // Using libp2p connect instead of mttnet connect to skip the handshake.
	// // This way we never actually exchange the site's key delegation, so we won't be
	// // syncing with sites that we don't care about using the regular syncing process.
	// //
	// // TODO(burdiyan): BAD!
	// if err := n.Libp2p().Connect(ctx, ai); err != nil {
	// 	return err
	// }

	// // client, err := n.SiteClient(ctx, ai.ID)
	// // if err != nil {
	// // 	return err
	// // }

	return nil
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

	clock := hlc.NewClock()
	ts := clock.Now()
	createTime := ts.Time().Unix()

	id, nonce := hyper.NewUnforgeableID("hm://g/", me.Account().Principal(), nil, createTime)
	eid := hyper.EntityID(id)
	e := hyper.NewEntityWithClock(eid, clock)

	patch := map[string]any{
		"nonce":      nonce,
		"title":      in.Title,
		"createTime": int(createTime),
		"owner":      []byte(me.Account().Principal()),
	}
	if in.Description != "" {
		patch["description"] = in.Description
	}

	if in.Members != nil {
		return nil, status.Errorf(codes.Unimplemented, "adding members when creating a group is not implemented yet")
	}

	if in.SiteSetupUrl != "" {
		siteURL, err := srv.initSiteServer(ctx, in.SiteSetupUrl, eid)
		if err != nil {
			return nil, err
		}

		patch["siteURL"] = siteURL
	}

	del, err := srv.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	hb, err := e.CreateChange(ts, me.DeviceKey(), del, patch, hyper.WithAction("Create"))
	if err != nil {
		return nil, err
	}

	if err := srv.blobs.SaveBlob(ctx, hb); err != nil {
		return nil, err
	}

	return groupToProto(e)
}

func (srv *Server) initSiteServer(ctx context.Context, setupURL string, groupID hyper.EntityID) (baseURL string, err error) {
	n, err := srv.node.Await(ctx)
	if err != nil {
		return "", err
	}

	{
		u, err := url.Parse(setupURL)
		if err != nil {
			return "", fmt.Errorf("failed to parse setup URL %s: %w", setupURL, err)
		}

		baseURL = (&url.URL{
			Scheme: u.Scheme,
			Host:   u.Host,
		}).String()
	}

	resp, err := GetSiteInfoHTTP(ctx, nil, baseURL)
	if err != nil {
		return "", fmt.Errorf("could not contact site at %s: %w", baseURL, err)
	}

	ai, err := addrInfoFromProto(resp.PeerInfo)
	if err != nil {
		return "", err
	}

	if err := n.Connect(ctx, ai); err != nil {
		return "", fmt.Errorf("failed to connect to site via P2P: %w", err)
	}

	c, err := n.SiteClient(ctx, ai.ID)
	if err != nil {
		return "", fmt.Errorf("could not get site rpc client: %w", err)
	}

	if _, err := c.InitializeServer(ctx, &groups.InitializeServerRequest{
		Secret:  setupURL,
		GroupId: string(groupID),
	}); err != nil {
		return "", fmt.Errorf("could not publish group to site: %w", err)
	}

	return baseURL, nil
}

func addrInfoFromProto(in *groups.PeerInfo) (ai peer.AddrInfo, err error) {
	pid, err := peer.Decode(in.PeerId)
	if err != nil {
		return ai, err
	}

	addrs, err := ipfs.ParseMultiaddrs(in.Addrs)
	if err != nil {
		return ai, fmt.Errorf("failed to parse peer info addrs: %w", err)
	}

	return peer.AddrInfo{
		ID:    pid,
		Addrs: addrs,
	}, nil
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

	return groupToProto(e)
}

// UpdateGroup updates a group.
func (srv *Server) UpdateGroup(ctx context.Context, in *groups.UpdateGroupRequest) (*groups.Group, error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
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

	for k, v := range in.UpdatedMembers {
		if v == groups.Role_ROLE_UNSPECIFIED {
			return nil, status.Errorf(codes.Unimplemented, "removing members is not implemented yet")
		}
		maputil.Set(patch, []string{"members", k}, int64(v))
	}

	del, err := srv.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	if in.SiteSetupUrl != "" {
		siteURL, err := srv.initSiteServer(ctx, in.SiteSetupUrl, eid)
		if err != nil {
			return nil, err
		}

		patch["siteURL"] = siteURL
	}

	hb, err := e.CreateChange(e.NextTimestamp(), me.DeviceKey(), del, patch, hyper.WithAction("Update"))
	if err != nil {
		return nil, err
	}

	if err := srv.blobs.SaveBlob(ctx, hb); err != nil {
		return nil, err
	}

	return groupToProto(e)
}

// ListGroups lists groups.
func (srv *Server) ListGroups(ctx context.Context, in *groups.ListGroupsRequest) (*groups.ListGroupsResponse, error) {
	entities, err := srv.blobs.ListEntities(ctx, "hm://g/")
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

	if in.Version != "" {
		return nil, status.Errorf(codes.Unimplemented, "listing members for groups at a specific version is not implemented yet")
	}

	resp := &groups.ListMembersResponse{}

	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		edb, err := hypersql.EntitiesLookupID(conn, in.Id)
		if err != nil {
			return err
		}
		if edb.EntitiesID == 0 {
			return fmt.Errorf("group %q not found", in.Id)
		}

		owner, err := hypersql.ResourceGetOwner(conn, edb.EntitiesID)
		if err != nil {
			return err
		}

		ownerPub, err := hypersql.PublicKeysLookupPrincipal(conn, owner)
		if err != nil {
			return err
		}

		resp.OwnerAccountId = core.Principal(ownerPub.PublicKeysPrincipal).String()

		return hypersql.GroupListMembers(conn, edb.EntitiesID, owner, func(principal []byte, role int64) error {
			if resp.Members == nil {
				resp.Members = make(map[string]groups.Role)
			}

			p, r := core.Principal(principal).String(), groups.Role(role)
			if r == groups.Role_ROLE_UNSPECIFIED {
				delete(resp.Members, p)
			} else {
				resp.Members[p] = r
			}

			return nil
		})
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

// ListDocumentGroups lists groups that a document belongs to.
func (srv *Server) ListDocumentGroups(ctx context.Context, in *groups.ListDocumentGroupsRequest) (*groups.ListDocumentGroupsResponse, error) {
	if in.DocumentId == "" {
		return nil, errutil.MissingArgument("documentId")
	}

	resp := &groups.ListDocumentGroupsResponse{}

	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		const q = `
			SELECT
				lookup.value AS entity,
				blobs.codec AS codec,
				blobs.multihash AS hash,
				blob_attrs.anchor AS anchor,
				blob_attrs.extra AS extra,
				blob_attrs.ts AS ts
			FROM blob_attrs
			JOIN changes ON changes.blob = blob_attrs.blob
			JOIN lookup ON lookup.id = changes.entity
			JOIN blobs ON blob_attrs.blob = blobs.id
			WHERE blob_attrs.key = 'group/content'
			AND blob_attrs.value_ptr IS NOT NULL
			AND blob_attrs.value_ptr = :document
		`

		edb, err := hypersql.EntitiesLookupID(conn, in.DocumentId)
		if err != nil {
			return err
		}
		if edb.EntitiesID == 0 {
			return fmt.Errorf("document %q not found: make sure to specify fully-qualified entity ID", in.DocumentId)
		}

		if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
			var (
				entity string
				codec  int64
				hash   []byte
				anchor string
				extra  []byte
				ts     int64
			)
			stmt.Scan(&entity, &codec, &hash, &anchor, &extra, &ts)

			var ld hyper.LinkData
			if err := json.Unmarshal(extra, &ld); err != nil {
				return err
			}

			var sb strings.Builder
			sb.WriteString(in.DocumentId)

			if ld.TargetVersion != "" {
				sb.WriteString("?v=")
				sb.WriteString(ld.TargetVersion)
			}

			if ld.TargetFragment != "" {
				sb.WriteString("#")
				sb.WriteString(ld.TargetFragment)
			}

			rawURL := sb.String()

			item := &groups.ListDocumentGroupsResponse_Item{
				GroupId:    entity,
				ChangeId:   cid.NewCidV1(uint64(codec), hash).String(),
				ChangeTime: timestamppb.New(time.UnixMicro(ts)),
				Path:       anchor,
				RawUrl:     rawURL,
			}

			resp.Items = append(resp.Items, item)
			return nil
		}, edb.EntitiesID); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

// ListAccountGroups lists groups that an account belongs to.
func (srv *Server) ListAccountGroups(ctx context.Context, in *groups.ListAccountGroupsRequest) (*groups.ListAccountGroupsResponse, error) {
	if in.AccountId == "" {
		return nil, errutil.MissingArgument("accountId")
	}

	acc, err := core.DecodePrincipal(in.AccountId)
	if err != nil {
		return nil, err
	}

	resp := &groups.ListAccountGroupsResponse{}

	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		accdb, err := hypersql.PublicKeysLookupID(conn, acc)
		if err != nil {
			return err
		}

		if accdb.PublicKeysID == 0 {
			return fmt.Errorf("account %q not found", in.AccountId)
		}

		// This query assumes that we've indexed only valid changes,
		// i.e. group members are only mutated by the owner.
		// TODO(burdiyan): support member removals and make sure to query
		// only valid changes.
		const q = `
			SELECT
				lookup.value AS entity,
				blob_attrs.extra AS role,
				MAX(blob_attrs.ts) AS ts
			FROM blob_attrs
			JOIN changes ON changes.blob = blob_attrs.blob
			JOIN lookup ON lookup.id = changes.entity
			WHERE blob_attrs.key = 'group/member'
			AND blob_attrs.value_ptr IS NOT NULL
			AND blob_attrs.value_ptr = :member
			GROUP BY changes.entity
		`

		if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
			var (
				group string
				role  int64
			)

			stmt.Scan(&group, &role)

			// TODO(burdiyan): this is really bad. Just use the database to get this info.
			g, err := srv.GetGroup(ctx, &groups.GetGroupRequest{
				Id: group,
			})
			if err != nil {
				return err
			}

			resp.Items = append(resp.Items, &groups.ListAccountGroupsResponse_Item{
				Group: g,
				Role:  groups.Role(role),
			})

			return nil
		}, accdb.PublicKeysID); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

func groupToProto(e *hyper.Entity) (*groups.Group, error) {
	createTime, ok := e.AppliedChanges()[0].Data.Patch["createTime"].(int)
	if !ok {
		return nil, fmt.Errorf("group entity doesn't have createTime field")
	}

	owner, ok := e.AppliedChanges()[0].Data.Patch["owner"].([]byte)
	if !ok {
		return nil, fmt.Errorf("group entity doesn't have owner field")
	}

	gpb := &groups.Group{
		Id:             string(e.ID()),
		CreateTime:     timestamppb.New(time.Unix(int64(createTime), 0)),
		OwnerAccountId: core.Principal(owner).String(),
		Version:        e.Version().String(),
		UpdateTime:     timestamppb.New(e.LastChangeTime().Time()),
	}
	if v, ok := e.Get("siteURL"); ok {
		vv, ok := v.(string)
		if ok {
			gpb.SiteInfo = &groups.Group_SiteInfo{
				BaseUrl: vv,
			}
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

// GetSiteInfoHTTP gets public information from a site.
// Users can pass nil HTTP client in which case the default global one will be used.
func GetSiteInfoHTTP(ctx context.Context, client *http.Client, siteURL string) (*groups.PublicSiteInfo, error) {
	if client == nil {
		client = http.DefaultClient
	}

	fmt.Println(siteURL)

	if siteURL[len(siteURL)-1] == '/' {
		return nil, fmt.Errorf("site URL must not have trailing slash: %s", siteURL)
	}

	requestURL := siteURL + "/.well-known/hypermedia-site"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("could not create request to well-known site: %w ", err)
	}

	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("could not contact to provided site [%s]: %w ", requestURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil, fmt.Errorf("site info url [%s] not working. Status code: %d", requestURL, res.StatusCode)
	}

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read json body: %w", err)
	}

	resp := &groups.PublicSiteInfo{}
	if err := protojson.Unmarshal(data, resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON body: %w", err)
	}

	return resp, nil
}
