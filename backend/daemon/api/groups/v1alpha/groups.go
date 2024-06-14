// Package groups implements the groups service.
package groups

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"seed/backend/core"
	groups "seed/backend/genproto/groups/v1alpha"
	p2p "seed/backend/genproto/p2p/v1alpha"
	"seed/backend/hlc"
	"seed/backend/hyper"
	"seed/backend/hyper/hypersql"
	"seed/backend/mttnet"
	"seed/backend/pkg/colx"
	"seed/backend/pkg/dqb"
	"seed/backend/pkg/errutil"
	"seed/backend/pkg/future"
	"seed/backend/syncing"
	"strings"
	"sync"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Server is the implementation of the groups service.
type Server struct {
	me    *future.ReadOnly[core.Identity]
	log   *zap.Logger
	blobs *hyper.Storage
	db    *DB
	node  *future.ReadOnly[*mttnet.Node]
}

// NewServer creates a new groups server.
func NewServer(me *future.ReadOnly[core.Identity], log *zap.Logger, db *DB, blobs *hyper.Storage, node *future.ReadOnly[*mttnet.Node]) *Server {
	return &Server{
		me:    me,
		log:   log,
		db:    db,
		blobs: blobs,
		node:  node,
	}
}

// StartPeriodicSync starts periodic sync of sites.
// It will block until the provided context is canceled.
func (srv *Server) StartPeriodicSync(ctx context.Context, warmup, interval time.Duration, burst bool) error {
	t := time.NewTimer(warmup)
	defer t.Stop()

	// Each interval we scan the list of known sites,
	// and start separate worker goroutines for each site (unless already started).
	// The worker goroutine syncs with the site using the same periodic interval.

	var wg sync.WaitGroup
	defer wg.Wait()

	// Creating a child context which will be cancelled anytime there's a fatal failure.
	// This will make sure all workers can be shutdown gracefully before exiting.
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Each worker has its own cancel function so that we can stop workers if we ever
	// remove sites from the database and need to stop syncing them. But this is
	// currently not implemented.
	siteWorkers := map[string]context.CancelFunc{}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			if err := srv.scheduleSiteWorkers(ctx, &wg, siteWorkers, interval, burst); err != nil {
				return err
			}
			t.Reset(interval)
		}
	}
}

// scheduleSiteWorkers by checking the list of sites in the database and making sure we have workers for each of them.
// The workers map argument is owned by this function, and it is unsafe for concurrency.
func (srv *Server) scheduleSiteWorkers(ctx context.Context,
	wg *sync.WaitGroup,
	siteWorkers map[string]context.CancelFunc,
	interval time.Duration,
	burst bool,
) error {
	groups, err := srv.db.ListSiteGroups(ctx)
	if err != nil {
		return err
	}
	// In order not to create a CPU overhead we spread sync routines throughout the
	// syncing interval
	roundSleep := time.Microsecond * 0
	const numSlots = 100
	every := 1

	if !burst {
		roundSleep = (interval * 70 / 100) / numSlots
		if len(groups) > numSlots {
			every = 1 + len(groups)/numSlots
		}
	}

	// TODO(burdiyan): handle removing sites and stopping workers.
	// It's currently not possible anyways.
	for i, group := range groups {
		if _, ok := siteWorkers[group]; ok {
			continue
		}

		ctx, cancel := context.WithCancel(ctx)
		siteWorkers[group] = cancel

		wg.Add(1)
		go func(group string) {
			log := srv.log.With(
				zap.String("groupID", group),
			)

			log.Debug("PeriodicSiteSyncWorkerStarter")
			defer func() {
				log.Debug("PeriodicSiteSyncWorkerStopped")
				wg.Done()
			}()

			// We randomly select a time to wait before we start the first sync.
			// This is an attempt to avoid making all the sites syncing at exactly the same time.
			t := time.NewTimer(time.Duration(rand.Intn(int(time.Minute)))) //nolint:gosec, We don't need a secure random generator here.
			defer t.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					start := time.Now()
					log.Debug("SiteSyncRoundStarted")

					// We want to log error message if sync round failed.
					logFunc := log.Debug
					err := srv.syncGroupSite(ctx, group, interval)
					if err != nil {
						logFunc = log.Warn
					}
					logFunc("SiteSyncRoundFinished",
						zap.Duration("duration", time.Since(start)),
						zap.Error(err),
					)

					t.Reset(interval)
				}
			}
		}(group)
		if i%every == 0 {
			time.Sleep(roundSleep)
		}
	}

	return nil
}

// SyncGroupSite syncs one group with its site in a blocking fashion.
func (srv *Server) SyncGroupSite(ctx context.Context, in *groups.SyncGroupSiteRequest) (*groups.SyncGroupSiteResponse, error) {
	if in.GroupId == "" {
		return nil, errutil.MissingArgument("groupId")
	}

	if err := srv.syncGroupSite(ctx, in.GroupId, 0); err != nil {
		return nil, err
	}

	sr, err := srv.db.GetGroupSite(ctx, in.GroupId)
	if err != nil {
		return nil, err
	}

	info := &groups.Group_SiteInfo{
		BaseUrl:        sr.URL,
		Version:        sr.RemoteVersion,
		LastSyncTime:   maybeTimeToProto(time.Unix(sr.LastSyncTime, 0)),
		LastOkSyncTime: maybeTimeToProto(time.Unix(sr.LastOKSyncTime, 0)),
		LastSyncError:  sr.LastSyncError,
	}

	return &groups.SyncGroupSiteResponse{
		SiteInfo: info,
	}, nil
}

// syncSite syncs one site and blocks until finished,
// unless the last time we've synced was within the specified interval.
func (srv *Server) syncGroupSite(ctx context.Context, group string, interval time.Duration) (err error) {
	sr, err := srv.db.GetGroupSite(ctx, group)
	if err != nil {
		return fmt.Errorf("failed to get site record for group %s: %w", group, err)
	}

	now := time.Now()
	lastSync := time.Unix(sr.LastSyncTime, 0)

	// Check if we actually need to sync. Check the time of the last sync.
	if now.Sub(lastSync) < interval {
		return nil
	}

	var info *groups.PublicSiteInfo
	// We want to record the timestamp of the last sync attempt, even if it fails.
	defer func() {
		err = errors.Join(err, srv.db.RecordGroupSiteSync(ctx, group, time.Now(), err, info))
	}()

	// We make remote call on every sync, because we want to make sure the site is actually serving the group we are syncing.
	info, err = GetSiteInfoHTTP(ctx, nil, sr.URL)
	if err != nil {
		return fmt.Errorf("failed to get site info: %w", err)
	}

	ai, err := addrInfoFromProto(info.PeerInfo)
	if err != nil {
		return err
	}

	if info.GroupId != sr.GroupID {
		return fmt.Errorf("group ID mismatch: remote %q != local %q", info.GroupId, sr.GroupID)
	}

	n, err := srv.node.Await(ctx)
	if err != nil {
		return err
	}

	if err := n.Connect(ctx, ai); err != nil {
		return err
	}

	client, err := n.Client(ctx, ai.ID)
	if err != nil {
		return err
	}

	pubKey, err := ai.ID.ExtractPublicKey()
	if err != nil {
		return fmt.Errorf("failed to extract public key from peer ID %s: %w", ai.ID, err)
	}

	remotePrincipal := core.PrincipalFromPubKey(pubKey)

	cursor, err := syncing.GetCursor(ctx, srv.db.db, remotePrincipal)
	if err != nil {
		return err
	}

	stream, err := client.ListBlobs(ctx, &p2p.ListBlobsRequest{Cursor: cursor})
	if err != nil {
		return err
	}

	bs := srv.blobs.IPFSBlockstore()

	type wantBlob struct {
		ID     cid.Cid
		Cursor string
	}

	// Pull from the site.
	var want []wantBlob
	onSite := map[cid.Cid]struct{}{}
	for {
		blob, err := stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return err
		}

		c, err := cid.Cast(blob.Cid)
		if err != nil {
			return fmt.Errorf("failed to parse CID of a blob: %w", err)
		}

		onSite[c] = struct{}{}

		ok, err := bs.Has(ctx, c)
		if err != nil {
			return fmt.Errorf("failed to check if we have blob %s: %w", c, err)
		}
		if ok {
			continue
		}

		want = append(want, wantBlob{ID: c, Cursor: blob.Cursor})
	}

	// Pulling those blobs we want from site.
	if len(want) > 0 {
		syncing.MSyncingWantedBlobs.WithLabelValues("groups").Add(float64(len(want)))
		defer syncing.MSyncingWantedBlobs.WithLabelValues("groups").Sub(float64(len(want)))

		sess := n.Bitswap().NewSession(ctx)
		var lastSavedCursor string
		for i, c := range want {
			blk, err := sess.GetBlock(ctx, c.ID)
			if err != nil {
				return fmt.Errorf("failed to get blob %s from site: %w", c, err)
			}

			if err := bs.Put(ctx, blk); err != nil {
				return fmt.Errorf("failed to put blob %s from site: %w", c, err)
			}

			if i%50 == 0 {
				if err := syncing.SaveCursor(ctx, srv.db.db, remotePrincipal, c.Cursor); err != nil {
					return err
				}
				lastSavedCursor = c.Cursor
			}
		}

		lastCursor := want[len(want)-1].Cursor
		if lastSavedCursor != lastCursor {
			if err := syncing.SaveCursor(ctx, srv.db.db, remotePrincipal, lastCursor); err != nil {
				return err
			}
		}
	}

	// Pushing to site if we can.
	{
		sc, err := n.SiteClient(ctx, ai.ID)
		if err != nil {
			return fmt.Errorf("failed to get site client: %w", err)
		}

		// This is a nasty way to check if we are allowed to push to the site.
		if _, err := sc.PublishBlobs(ctx, &groups.PublishBlobsRequest{}); status.Code(err) == codes.PermissionDenied {
			return nil
		}

		// Reusing the same slice to reduce allocations.
		missingOnSite := want[:0]

		// Collect relevant blobs locally
		if err := srv.db.ForEachRelatedBlob(ctx, hyper.EntityID(sr.GroupID), func(c cid.Cid) error {
			if _, ok := onSite[c]; ok {
				return nil
			}

			missingOnSite = append(missingOnSite, wantBlob{ID: c}) // no cursor here.

			return nil
		}); err != nil {
			return err
		}

		if len(missingOnSite) == 0 {
			return nil
		}

		if _, err := sc.PublishBlobs(ctx, &groups.PublishBlobsRequest{
			Blobs: colx.SliceMap(missingOnSite, func(w wantBlob) string {
				return w.ID.String()
			}),
		}); err != nil {
			return fmt.Errorf("failed to push blobs to the site: %w", err)
		}
	}

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
	ts := clock.MustNow()
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

	return srv.groupToProto(ctx, e)
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

	addrs, err := colx.SliceMapErr(in.Addrs, multiaddr.NewMultiaddr)
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
		v, err := srv.blobs.LoadEntityAll(ctx, eid)
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

	if e == nil {
		return nil, status.Errorf(codes.NotFound, "group %q with version %q not found", in.Id, in.Version)
	}

	return srv.groupToProto(ctx, e)
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
	e, err := srv.blobs.LoadEntityAll(ctx, eid)
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

	if in.Description != nil {
		old, ok := e.Get("description")
		if !ok || old.(string) != in.Description.Value {
			patch["description"] = in.Description.Value
		}
	}

	for k, v := range in.UpdatedContent {
		oldv, ok := e.Get("content", k)
		if !ok || oldv.(string) != v {
			colx.ObjectSet(patch, []string{"content", k}, v)
		}
	}

	for k, v := range in.UpdatedMembers {
		if v == groups.Role_ROLE_UNSPECIFIED {
			return nil, status.Errorf(codes.Unimplemented, "removing members is not implemented yet")
		}
		colx.ObjectSet(patch, []string{"members", k}, int64(v))
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

	grouppb, err := srv.groupToProto(ctx, e)
	if err != nil {
		return nil, err
	}

	if v, ok := e.Get("siteURL"); ok {
		vv, ok := v.(string)
		if ok {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
				defer cancel()
				if err := srv.syncGroupSite(ctx, in.Id, 0); err != nil {
					srv.log.Error("PushGroupToSiteError", zap.String("groupID", in.Id), zap.String("siteURL", vv), zap.Error(err))
				}
			}()
		}
	}

	return grouppb, nil
}

// ListGroups lists groups.
func (srv *Server) ListGroups(ctx context.Context, in *groups.ListGroupsRequest) (*groups.ListGroupsResponse, error) {
	entities, err := srv.blobs.ListEntities(ctx, "hm://g/*")
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
		v, err := srv.blobs.LoadEntityAll(ctx, eid)
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

	if e == nil {
		return nil, status.Errorf(codes.NotFound, "group '%s' with version '%s' is not found", in.Id, in.Version)
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
		if edb.ResourcesID == 0 {
			return fmt.Errorf("group %q not found", in.Id)
		}

		owner, err := hypersql.ResourceGetOwner(conn, edb.ResourcesID)
		if err != nil {
			return err
		}

		ownerPub, err := hypersql.PublicKeysLookupPrincipal(conn, owner)
		if err != nil {
			return err
		}

		resp.OwnerAccountId = core.Principal(ownerPub.PublicKeysPrincipal).String()

		return hypersql.GroupListMembers(conn, edb.ResourcesID, owner, func(principal []byte, role int64) error {
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
		edb, err := hypersql.EntitiesLookupID(conn, in.DocumentId)
		if err != nil {
			return err
		}
		if edb.ResourcesID == 0 {
			return fmt.Errorf("document %q not found: make sure to specify fully-qualified entity ID", in.DocumentId)
		}

		if err := sqlitex.Exec(conn, qListDocumentGroups(), func(stmt *sqlite.Stmt) error {
			var (
				entity string
				codec  int64
				hash   []byte
				extra  []byte
				ts     int64
			)
			stmt.Scan(&entity, &codec, &hash, &extra, &ts)

			var ld hyper.DocLinkMeta
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
				Path:       ld.Anchor,
				RawUrl:     rawURL,
			}

			resp.Items = append(resp.Items, item)
			return nil
		}, edb.ResourcesID); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

var qListDocumentGroups = dqb.Str(`
	SELECT
		resources.iri AS entity,
		blobs.codec AS codec,
		blobs.multihash AS hash,
		resource_links.meta AS meta,
		structural_blobs.ts AS ts
	FROM resource_links
	JOIN structural_blobs ON structural_blobs.id = resource_links.source
	JOIN blobs INDEXED BY blobs_metadata ON blobs.id = structural_blobs.id
	JOIN resources ON resources.id = structural_blobs.resource
	WHERE resource_links.type = 'group/content'
	AND resource_links.target = :document
`)

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
		accdb, err := hypersql.EntitiesLookupID(conn, "hm://a/"+acc.String())
		if err != nil {
			return err
		}
		if accdb.ResourcesID == 0 {
			return fmt.Errorf("account %q not found", in.AccountId)
		}

		if err := sqlitex.Exec(conn, qListAccountGroups(), func(stmt *sqlite.Stmt) error {
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
		}, accdb.ResourcesID); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

// This query assumes that we've indexed only valid changes,
// i.e. group members are only mutated by the owner.
// TODO(burdiyan): support member removals and make sure to query
// only valid changes.
var qListAccountGroups = dqb.Str(`
	SELECT
		resources.iri AS entity,
		resource_links.meta->>'r' AS role,
		MAX(structural_blobs.ts) AS ts
	FROM resource_links
	JOIN structural_blobs ON structural_blobs.id = resource_links.source
	JOIN resources ON resources.id = structural_blobs.resource
	WHERE resource_links.type = 'group/member'
	AND resource_links.target = :member
	GROUP BY structural_blobs.resource
`)

func (srv *Server) groupToProto(ctx context.Context, e *hyper.Entity) (*groups.Group, error) {
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
		_, ok := v.(string)
		if ok {
			sr, err := srv.db.GetGroupSite(ctx, gpb.Id)
			if err != nil {
				if status.Code(err) != codes.NotFound {
					return nil, err
				}
			} else {
				gpb.SiteInfo = &groups.Group_SiteInfo{
					BaseUrl:        sr.URL,
					Version:        sr.RemoteVersion,
					LastSyncTime:   maybeTimeToProto(time.Unix(sr.LastSyncTime, 0)),
					LastOkSyncTime: maybeTimeToProto(time.Unix(sr.LastOKSyncTime, 0)),
					LastSyncError:  sr.LastSyncError,
				}
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

func maybeTimeToProto(t time.Time) *timestamppb.Timestamp {
	if t.IsZero() {
		return nil
	}
	return timestamppb.New(t)
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

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil, fmt.Errorf("site info url %q not working, status code: %d, response body: %s", requestURL, res.StatusCode, data)
	}

	resp := &groups.PublicSiteInfo{}
	if err := protojson.Unmarshal(data, resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON body: %w", err)
	}

	return resp, nil
}
