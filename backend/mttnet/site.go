// Package mttnet exposes the site functions to be exposed over p2p.
package mttnet

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"mintter/backend/core"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	site "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet/sitesql"
	"net/http"
	"net/url"
	"reflect"
	"runtime"
	"strings"
	"sync"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/libp2p/go-libp2p/core/peer"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	rpcpeer "google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type headerKey string

const (
	// GRPCPort is the port where sites will externally expose the grpc interface.
	GRPCPort = 56002
	// TargetSiteHostnameHeader is the headers bearing the remote site hostname to proxy calls to.
	TargetSiteHostnameHeader = "x-mintter-site-hostname"
	// TargetSiteAddrsHeader is the headers bearing the remote site addresses to proxy calls to.
	// In initial site add, the address are not in the database and they need to proxy to call redeemtoken.
	TargetSiteAddrsHeader headerKey = "x-mintter-site-addresses"
	// GRPCOriginAcc is the key to pass the account id via context down to a proxied call
	// In initial site add, the account is not in the database and it needs to proxy to call redeemtoken.
	GRPCOriginAcc headerKey = "x-mintter-site-grpc-origin-acc"
	// WellKnownPath is the path (to be completed with http(s)+domain) to call to get data from site.
	WellKnownPath = "api/mintter-well-known"
)

func GetSiteInfoHttp(SiteHostname string) (*documents.SiteDiscoveryConfig, error) {
	requestURL := fmt.Sprintf("%s/%s", SiteHostname, WellKnownPath)

	req, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("add site: could not create request to well-known site: %w ", err)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("add site: could not contact to provided site [%s]: %w ", requestURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil, fmt.Errorf("add site: site info url [%s] not working. Status code: %d", requestURL, res.StatusCode)
	}

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read json body: %w", err)
	}

	var resp documents.SiteDiscoveryConfig

	if err := protojson.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON body: %w", err)
	}
	return &resp, nil
}

// CreateInviteToken creates a new invite token for registering a new member.
func (srv *Server) CreateInviteToken(ctx context.Context, in *site.CreateInviteTokenRequest) (*site.InviteToken, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.InviteToken)
		if !ok {
			return nil, fmt.Errorf("format of proxied return value not recognized")
		}
		return retValue, nil
	}

	if in.Role == site.Member_OWNER {
		return nil, fmt.Errorf("cannot create owner token, please update the owner manually in site config")
	}

	if in.Role == site.Member_ROLE_UNSPECIFIED {
		return nil, status.Errorf(codes.InvalidArgument, "token role must be specified")
	}

	newToken := newInviteToken()

	now := time.Now()

	var expireTime time.Time
	if in.ExpireTime != nil {
		inTime := in.ExpireTime.AsTime()
		if inTime.Before(now) {
			return nil, fmt.Errorf("expiration time must be in the future")
		}
		expireTime = inTime
	} else {
		expireTime = now.Add(srv.InviteTokenExpirationDelay)
	}

	n, err := srv.Node.Await(ctx)
	if err != nil {
		return nil, fmt.Errorf("node is not ready yet: %w", err)
	}

	conn, release, err := n.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err = sitesql.AddToken(conn, newToken, expireTime.Unix(), int64(in.Role)); err != nil {
		return nil, err
	}

	if err := sitesql.RemoveExpiredTokens(conn); err != nil {
		return nil, err
	}

	return &site.InviteToken{
		Token:      newToken,
		ExpireTime: timestamppb.New(expireTime),
	}, nil
}

// RedeemInviteToken redeems a previously created invite token to register a new member.
func (srv *Server) RedeemInviteToken(ctx context.Context, in *site.RedeemInviteTokenRequest) (*site.RedeemInviteTokenResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.RedeemInviteTokenResponse)
		if !ok {
			return nil, fmt.Errorf("format of proxied return value not recognized")
		}
		return retValue, nil
	}

	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("node not ready yet")
	}

	if acc.String() == srv.owner.String() {
		return &site.RedeemInviteTokenResponse{Role: site.Member_OWNER}, nil
	}

	conn, release, err := n.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var resp *site.RedeemInviteTokenResponse
	if err := sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
		// check if that account already a member
		if in.Token == "" {
			role, err := sitesql.GetMemberRole(conn, acc)
			if err != nil {
				return err
			}
			if role == 0 {
				return fmt.Errorf("only site owner can add a site without a token")
			}

			resp = &site.RedeemInviteTokenResponse{Role: role}
			return nil
		}

		tokenInfo, err := sitesql.GetToken(conn, in.Token)
		if err != nil {
			return err
		}

		if tokenInfo.InviteTokensRole == 0 {
			return status.Errorf(codes.NotFound, "unknown invite token")
		}

		expireTime := time.Unix(tokenInfo.InviteTokensExpireTime, 0)

		if err = sitesql.RemoveToken(conn, in.Token); err != nil {
			return fmt.Errorf("could not redeem the token %w", err)
		}

		if expireTime.Before(time.Now()) {
			return fmt.Errorf("expired token")
		}

		if _, err = sitesql.AddMember(conn, acc, tokenInfo.InviteTokensRole); err != nil {
			return fmt.Errorf("failed to add member: %w", err)
		}

		resp = &site.RedeemInviteTokenResponse{Role: site.Member_Role(tokenInfo.InviteTokensRole)}

		return nil
	}); err != nil {
		return nil, err
	}

	return resp, err
}

// GetSiteInfo Gets public-facing site information.
func (srv *Server) GetSiteInfo(ctx context.Context, in *site.GetSiteInfoRequest) (*site.SiteInfo, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.SiteInfo)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	//make GetSiteTitle that returns "" when does not find the title tag
	title, err := sitesql.GetSiteTitle(conn)
	if err != nil {
		return nil, fmt.Errorf("Could not get title")
	}
	//make GetSiteDescription that returns "" when does not find the description tag
	description, err := sitesql.GetSiteDescription(conn)
	if err != nil {
		return nil, fmt.Errorf("Could not get title")
	}
	return &site.SiteInfo{
		Hostname:    srv.hostname,
		Title:       title.GlobalMetaValue,
		Description: description.GlobalMetaValue,
		Owner:       srv.owner.String(),
	}, nil
}

// UpdateSiteInfo updates public-facing site information. Doesn't support partial updates, hence all the fields must be provided.
func (srv *Server) UpdateSiteInfo(ctx context.Context, in *site.UpdateSiteInfoRequest) (*site.SiteInfo, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.SiteInfo)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()

	ret := site.SiteInfo{Hostname: srv.hostname,
		Owner: srv.owner.String(),
	}
	if in.Title != "" {
		if err = sitesql.SetSiteTitle(conn, in.Title); err != nil {
			return nil, fmt.Errorf("Could not set new title: %w", err)
		}
		ret.Title = in.Title
	}
	if in.Description != "" {
		if err = sitesql.SetSiteDescription(conn, in.Description); err != nil {
			return nil, fmt.Errorf("Could not set new description: %w", err)
		}
		ret.Description = in.Description
	}
	// Now update the profile accordingly
	if err = srv.updateSiteBio(ctx, in.Title, in.Description); err != nil {
		return nil, fmt.Errorf("Update Site Info: Could not update Site Bio accordingly: %w", err)
	}
	return &ret, nil
}

// ListMembers lists registered members on the site.
func (srv *Server) ListMembers(ctx context.Context, in *site.ListMembersRequest) (*site.ListMembersResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.ListMembersResponse)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var members []*site.Member
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	memberList, err := sitesql.ListMembers(conn)
	if err != nil {
		return nil, fmt.Errorf("Cannot get site members: %w", err)
	}
	for _, member := range memberList {
		members = append(members, &site.Member{
			AccountId: core.Principal(member.PublicKeysPrincipal).String(),
			Role:      site.Member_Role(member.SiteMembersRole),
		})
	}
	return &site.ListMembersResponse{Members: members}, nil
}

// GetMember gets information about a specific member.
func (srv *Server) GetMember(ctx context.Context, in *site.GetMemberRequest) (*site.Member, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.Member)
		if !ok {
			return nil, fmt.Errorf("format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("node not ready yet")
	}

	account, err := core.DecodePrincipal(in.AccountId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode account id principal %s: %w", in.AccountId, err)
	}

	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("cannot connect to internal db: %w", err)
	}
	defer cancel()

	role, err := sitesql.GetMemberRole(conn, account)
	if err != nil {
		return nil, fmt.Errorf("member not found")
	}
	return &site.Member{AccountId: in.AccountId, Role: role}, nil
}

// DeleteMember deletes an existing member.
func (srv *Server) DeleteMember(ctx context.Context, in *site.DeleteMemberRequest) (*emptypb.Empty, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*emptypb.Empty)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}

	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}

	account, err := core.DecodePrincipal(in.AccountId)
	if err != nil {
		return nil, fmt.Errorf("Provided account id [%s] not a valid cid: %w", in.AccountId, err)
	}

	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	roleToDelete, err := sitesql.GetMemberRole(conn, account)
	if err != nil {
		return nil, fmt.Errorf("Member not found")
	}

	if roleToDelete == site.Member_OWNER {
		return nil, fmt.Errorf("Site owner cannot be deleted, please, change it manually in site config")
	}
	if err = sitesql.RemoveMember(conn, account); err != nil {
		return nil, fmt.Errorf("Could not remove provided member [%s]: %w", in.AccountId, err)
	}

	return &emptypb.Empty{}, nil
}

// PublishDocument publishes and pins the document to the public web site.
func (srv *Server) PublishDocument(ctx context.Context, in *site.PublishDocumentRequest) (*site.PublishDocumentResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.PublishDocumentResponse)
		if !ok {
			return nil, fmt.Errorf("format of proxied return value not recognized")
		}
		return retValue, nil
	}

	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID")
	}

	u, err := url.Parse(in.Path)
	if err != nil || u.Path != in.Path {
		return nil, fmt.Errorf("path %s is not a valid path", in.Path)
	}

	n, err := srv.Node.Await(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't proxy: local p2p node is not ready yet: %w", err)
	}

	docEntity := hyper.EntityID("hd://d/" + in.DocumentId)

	toSync := []hyper.EntityID{docEntity}

	for _, ref := range in.ReferencedDocuments {
		toSync = append(toSync, hyper.EntityID("hd://d/"+ref.DocumentId))
	}

	var dels []hypersql.KeyDelegationsListResult
	if err := n.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		dels, err = hypersql.KeyDelegationsList(conn, acc)
		return err
	}); err != nil {
		return nil, err
	}

	var wg sync.WaitGroup
	for _, del := range dels {
		wg.Add(1)
		device := core.Principal(del.KeyDelegationsViewDelegate)
		pid, err := device.PeerID()
		if err != nil {
			n.log.Warn("BadPeer", zap.String("principal", device.String()))
			continue
		}

		go func(pid peer.ID) {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(ctx, time.Duration(5*time.Second))
			defer cancel()
			n.log.Debug("Publish Document: Syncing...", zap.String("DeviceID", device.String()), zap.Int("Documents to sync", len(toSync)))

			if err = srv.synchronizer.SyncWithPeer(ctx, pid, toSync...); err != nil {
				n.log.Debug("Publish Document: couldn't sync content with device", zap.String("device", device.String()), zap.Error(err))
				return
			}
			n.log.Debug("Successfully synced", zap.String("Peer", device.String()))
		}(pid)
	}
	wg.Wait()

	_, err = srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
		DocumentId: in.DocumentId,
		Version:    in.Version,
		LocalOnly:  true,
	})
	if err != nil {
		return nil, fmt.Errorf("couldn't find the actual document + version to publish in the database: %w", err)
	}

	// If path already taken, we update in case doc_ids match (just updating the version) error otherwise
	if err := n.db.WithTx(ctx, func(conn *sqlite.Conn) error {
		record, err := sitesql.GetWebPublicationRecordByPath(conn, in.Path)
		if err != nil {
			return err
		}

		if record.HDEntitiesID != 0 {
			recordEntity := hyper.EntityID(record.HDEntitiesEID)
			if !recordEntity.HasPrefix("hd://d/") {
				return fmt.Errorf("invalid entity ID for mintter document: %s", record.HDEntitiesEID)
			}

			if recordEntity == docEntity && record.WebPublicationsVersion == in.Version {
				return fmt.Errorf("provided document+version already exists in path [%s]", in.Path)
			}
			if recordEntity != docEntity {
				return fmt.Errorf("path %q is already taken by a different entity %q, can't use it for document %q", in.Path, recordEntity, in.DocumentId)
			}
			if err = sitesql.RemoveWebPublicationRecord(conn, record.HDEntitiesEID, record.WebPublicationsVersion); err != nil {
				return fmt.Errorf("could not remove previous version [%s] in the same path: %w", record.WebPublicationsVersion, err)
			}
		}

		if err := sitesql.AddWebPublicationRecord(conn, string(docEntity), in.Version, in.Path); err != nil {
			return fmt.Errorf("could not insert document in path [%s]: %w", in.Path, err)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return &site.PublishDocumentResponse{}, nil
}

// UnpublishDocument un-publishes a given document. Only the author of that document or the owner can unpublish.
func (srv *Server) UnpublishDocument(ctx context.Context, in *site.UnpublishDocumentRequest) (*site.UnpublishDocumentResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.UnpublishDocumentResponse)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()

	eid := hyper.EntityID("hd://d/" + in.DocumentId)

	records, err := sitesql.GetWebPublicationsByID(conn, string(eid))
	if err != nil {
		return nil, fmt.Errorf("Cannot unpublish: %w", err)
	}
	for _, record := range records {
		if in.Version == "" || in.Version == record.WebPublicationsVersion {
			doc, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
				DocumentId: in.DocumentId,
				Version:    record.WebPublicationsVersion,
				LocalOnly:  true,
			})
			if err != nil {
				return nil, fmt.Errorf("couldn't find the actual document to unpublish although it was found in the database: %w", err)
			}
			if acc.String() != doc.Document.Author && srv.owner.String() != acc.String() {
				return nil, fmt.Errorf("you are not the author of the document, nor site owner")
			}
			if err = sitesql.RemoveWebPublicationRecord(conn, string(eid), record.WebPublicationsVersion); err != nil {
				return nil, fmt.Errorf("couldn't remove document [%s]: %w", in.DocumentId, err)
			}
		}
	}
	return &site.UnpublishDocumentResponse{}, nil
}

// ListWebPublications lists all the published documents.
func (srv *Server) ListWebPublications(ctx context.Context, in *site.ListWebPublicationsRequest) (*site.ListWebPublicationsResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.ListWebPublicationsResponse)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var publications []*site.WebPublicationRecord
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	records, err := sitesql.ListWebPublications(conn)
	if err != nil {
		return nil, fmt.Errorf("Cannot List publications: %w", err)
	}

	for _, record := range records {
		docid := hyper.EntityID(record.HDEntitiesEID).TrimPrefix("hd://d/")
		if docid == record.HDEntitiesEID {
			return nil, fmt.Errorf("BUG: invalid entity ID %q for a document in web publications", record.HDEntitiesEID)
		}

		if in.DocumentId != "" && in.DocumentId != docid {
			continue
		}

		publications = append(publications, &site.WebPublicationRecord{
			DocumentId: docid,
			Version:    record.WebPublicationsVersion,
			Hostname:   srv.hostname,
			Path:       record.WebPublicationsPath,
		})
	}
	return &site.ListWebPublicationsResponse{Publications: publications}, nil
}

// GetPath gets a publication given the path it has been publish to.
func (srv *Server) GetPath(ctx context.Context, in *site.GetPathRequest) (*site.GetPathResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return nil, err
	}
	if proxied {
		retValue, ok := res.(*site.GetPathResponse)
		if !ok {
			return nil, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	if in.Path == "" {
		return nil, fmt.Errorf("Invalid path")
	}
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	record, err := sitesql.GetWebPublicationRecordByPath(conn, in.Path)
	if err != nil {
		return nil, fmt.Errorf("Could not get record for path [%s]: %w", in.Path, err)
	}
	ret, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
		DocumentId: hyper.EntityID(record.HDEntitiesEID).TrimPrefix("hd://d/"),
		Version:    record.WebPublicationsVersion,
		LocalOnly:  true,
	})
	if err != nil {
		return nil, fmt.Errorf("Could not get local document although was found in the list of published documents: %w", err)
	}
	return &site.GetPathResponse{Publication: ret}, err
}

func getRemoteSiteFromHeader(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", fmt.Errorf("There is no metadata provided in context")
	}
	token := md.Get(string(TargetSiteHostnameHeader))
	if len(token) != 1 {
		return "", fmt.Errorf("Header [%s] not found in metadata", TargetSiteHostnameHeader)
	}
	return token[0], nil
}

func getGrpcOriginAcc(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", fmt.Errorf("There is no metadata provided in context")
	}
	token := md.Get(string(GRPCOriginAcc))
	if len(token) != 1 {
		return "", fmt.Errorf("Header [%s] not found in metadata", GRPCOriginAcc)
	}
	return token[0], nil
}

// getRemoteID gets the remote peer id if there is an opened p2p connection between them with context ctx.
func getRemoteID(ctx context.Context) (peer.ID, error) {
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		return "", fmt.Errorf("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return "", err
	}

	return pid, nil
}

func newInviteToken() string {
	randomBytes := make([]byte, 16)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(randomBytes)
}

// Client dials a remote peer if necessary and returns the RPC client handle.
func (srv *Server) Client(ctx context.Context, remoteHostname string) (site.WebSiteClient, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	contextAddrs := ctx.Value(TargetSiteAddrsHeader)

	conn, cancel, err := n.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer cancel()
	// actually we only need the peerID, not the addresses, but they are
	// handy in case we are not connected so we don't call well-known.
	remoteSite, err := sitesql.GetSite(conn, remoteHostname)
	if err != nil {
		return nil, fmt.Errorf("Could not get address info for site [%s]: %w", remoteHostname, err)
	}
	addrs := remoteSite.SitesAddresses
	if addrs == "" { //means we haven't added the site yet (redeem token at adding site).
		if contextAddrs == nil {
			return nil, fmt.Errorf("Site [%s] address not found neither in headers nor db: %w", remoteHostname, err)
		}
		if addrs, ok = contextAddrs.(string); !ok {
			return nil, fmt.Errorf("Could not parse [%v] to string", contextAddrs)
		}
	}
	info, err := AddrInfoFromStrings(strings.Split(addrs, ",")...)
	if err != nil {
		return nil, fmt.Errorf("failed to parse site address [%s]: %w", addrs, err)
	}
	ctx, cancelCtx := context.WithTimeout(ctx, 7*time.Second)
	defer cancelCtx()
	// we don't want to call well-known if either 1) we are already connected or 2) we were connected
	// in previous sessions and we just woke up. In either case calling well-known would be slowdown.
	// The only case where well-known will be called again is if the old addresses are no longer valid
	// i.e. site owner deleted the db and started over with new peer IDs.
	err = n.Connect(ctx, info)
	if err != nil {
		n.log.Warn("Could not reuse site connection, getting new addresses", zap.Error(err))
		resp, err := GetSiteInfoHttp(remoteHostname)
		if err != nil {
			return nil, fmt.Errorf("Could not get site [%s] info via http: %w", remoteHostname, err)
		}
		info, err := AddrInfoFromStrings(resp.Addresses...)
		if err != nil {
			return nil, fmt.Errorf("Couldn't parse multiaddress [%s]: %w", strings.Join(resp.Addresses, ","), err)
		}
		if err := n.Connect(ctx, info); err != nil {
			return nil, fmt.Errorf("failed to connect to site [%s] with new addresses [%s]: %w", remoteHostname, strings.Join(resp.Addresses, ","), err)
		}
		if remoteSite.SitesHostname != "" && remoteSite.SitesAddresses != "" && remoteSite.SitesAddresses != strings.Join(resp.Addresses, ",") { // if "" means We haven't added the site yet (redeem token at adding site).
			//update the site with new addresses
			if err = sitesql.AddSite(conn, remoteSite.PublicKeysPrincipal, strings.Join(resp.Addresses, ","), remoteHostname, remoteSite.SitesRole); err != nil {
				return nil, fmt.Errorf("add site: could not insert site in the database: %w", err)
			}
		}
	}

	return n.client.DialSite(ctx, info.ID)
}

func (srv *Server) checkPermissions(ctx context.Context, requiredRole site.Member_Role, params ...interface{}) (core.Principal, bool, interface{}, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, false, nil, fmt.Errorf("Node not ready yet")
	}

	remoteHostname, err := getRemoteSiteFromHeader(ctx)
	if err != nil && srv.hostname == "" { // no headers and not a site
		return nil, false, nil, fmt.Errorf("This node is not a site, please provide a proper headers to proxy the call to a remote site: %w", err)
	}

	acc := n.me.Account().Principal()
	n.log.Debug("Check permissions", zap.String("Site hostname", srv.hostname), zap.String("remoteHostname", remoteHostname), zap.Error(err))
	if err == nil && srv.hostname != remoteHostname && srv.hostname != "" {
		return acc, false, nil, fmt.Errorf("Hostnames don't match. This site's hostname is [%s] but called with headers [%s]", srv.hostname, remoteHostname)
	}

	if err == nil && srv.hostname != remoteHostname && srv.hostname == "" { //This call is intended to be proxied so its site's duty to check permission
		// proxy to remote
		if len(params) == 0 {
			n.log.Error("Headers found, meaning this call should be proxied, but remote function params not provided")
			return acc, false, nil, fmt.Errorf("In order to proxy a call (headers found) you need to provide a valid proxy func and a params")
		}
		n.log.Debug("Headers found, meaning this call should be proxied and authentication will take place at the remote site", zap.String(string(TargetSiteHostnameHeader), remoteHostname))

		// We will extract the caller's function name so we know which function to call in the remote site
		// We opted to to make it generic so the proxying code is in one place only (proxyToSite).
		pc, _, _, _ := runtime.Caller(1)
		proxyFcnList := strings.Split(runtime.FuncForPC(pc).Name(), ".")
		proxyFcn := proxyFcnList[len(proxyFcnList)-1]
		// Since proxyFcn is taken from the name of the caller (same codebase as the one
		// in proxyToSite), we don't expect the reflection to panic at runtime.
		res, errInterface := srv.proxyToSite(ctx, remoteHostname, proxyFcn, params...)
		if errInterface != nil {
			err, ok := errInterface.(error)
			if !ok {
				return acc, true, res, fmt.Errorf("Proxied call returned unknown second parameter. Error type expected")
			}
			return acc, true, res, err
		}
		return acc, true, res, nil
	}

	if err != nil || srv.hostname == remoteHostname { //either a proxied call or a direct call without headers (nodejs)
		// this would mean this is a proxied call so we take the account from the remote caller ID
		remoteAcc, err := getGrpcOriginAcc(ctx)
		if err != nil {
			remoteDeviceID, err := getRemoteID(ctx)
			if err == nil {
				// this would mean this is a proxied call so we take the account from the remote caller ID
				remotAcc, err := n.AccountForDevice(ctx, remoteDeviceID)
				if err != nil {
					return nil, false, nil, fmt.Errorf("checkPermissions: couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
				}

				n.log.Debug("PROXIED CALL", zap.String("Local AccountID", acc.String()), zap.String("Remote AccountID", remotAcc.String()), zap.Error(err))
				acc = remotAcc
			} else {
				// this would mean we cannot get remote ID it must be a local call
				n.log.Debug("LOCAL CALL", zap.String("Local AccountID", acc.String()), zap.String("remoteHostname", remoteHostname), zap.Error(err))
			}
		} else {
			acc, err = core.DecodePrincipal(remoteAcc)
			if err != nil {
				return nil, false, nil, fmt.Errorf("Invalid Account [%s]: %w", remoteAcc, err)
			}

		}

	}

	if !srv.NoAuth && requiredRole == site.Member_OWNER && acc.String() != srv.owner.String() {
		return nil, false, nil, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
	} else if requiredRole == site.Member_EDITOR && acc.String() != srv.owner.String() {
		conn, cancel, err := n.db.Conn(ctx)
		if err != nil {
			return nil, false, nil, fmt.Errorf("Cannot connect to internal db: %w", err)
		}
		defer cancel()

		role, err := sitesql.GetMemberRole(conn, acc)
		if !srv.NoAuth && (err != nil || role != requiredRole) {
			return nil, false, nil, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
		}
	}
	return acc, false, nil, nil
}

// updateSiteBio updates the site bio according to the site SEO description.
func (srv *Server) updateSiteBio(ctx context.Context, title, description string) error {
	n, ok := srv.Node.Get()
	if !ok {
		return fmt.Errorf("Node not ready yet")
	}

	return accounts.UpdateProfile(ctx, n.me, n.blobs, &accounts.Profile{
		Alias: title,
		Bio:   description,
	})
}

// ServeHTTP serves the content for the well-known path.
func (srv *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")
	if srv.hostname == "" { // if i'm not a site, then don't expose addresses
		http.Error(w, "This node is not a Site", http.StatusExpectationFailed)
		return
	}

	info := &documents.SiteDiscoveryConfig{}

	n, ok := srv.Node.Get()
	if !ok {
		w.Header().Set("Retry-After", "30")
		http.Error(w, "P2P node is not ready yet", http.StatusServiceUnavailable)
		return
	}
	pid := n.me.DeviceKey().PeerID()

	info.AccountId = n.me.Account().String()
	info.PeerId = pid.String()

	addrinfo := n.AddrInfo()
	mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
	if err != nil {
		http.Error(w, "failed to get our own adresses", http.StatusInternalServerError)
		return
	}

	for _, addr := range mas {
		info.Addresses = append(info.Addresses, addr.String())
	}

	data, err := protojson.MarshalOptions{
		Multiline: true,
		Indent:    "  ",
	}.Marshal(info)
	if err != nil {
		http.Error(w, "Failed to marshal site info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// proxyToSite calls a remote site function over libp2p. It uses reflections to
// avoid having the proxying code spread in many function calls. Since the
// function's name to call is taken from this codebase, there should not be any
// inconsistency and no panic is expected at runtime (due to unknown function name).
func (srv *Server) proxyToSite(ctx context.Context, siteHostname string, proxyFcn string, params ...interface{}) (interface{}, interface{}) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("can't proxy. Local p2p node not ready yet")
	}
	n.log.Debug("Dialing remote peer....", zap.String("Hostname", siteHostname))
	sitec, err := srv.Client(ctx, siteHostname)
	if err != nil {
		return nil, fmt.Errorf("failed to dial to site: %w", err)
	}
	n.log.Debug("Remote site dialed, now try to call a remote function", zap.String("Function name", proxyFcn))

	in := []reflect.Value{reflect.ValueOf(ctx)}
	for _, param := range params {
		in = append(in, reflect.ValueOf(param))
	}
	in = append(in, reflect.ValueOf([]grpc.CallOption{}))

	f := reflect.ValueOf(sitec).MethodByName(proxyFcn)
	if !f.IsValid() {
		return nil, fmt.Errorf("Won't call %s since it does not exist", proxyFcn)
	}
	if f.Type().NumOut() != 2 {
		return nil, fmt.Errorf("Proxied call %s expected to return 2 (return value + error) param but returns %d", proxyFcn, f.Type().NumOut())
	}
	if len(params) != f.Type().NumIn()-2 {
		return nil, fmt.Errorf("function %s needs %d params, %d provided", proxyFcn, f.Type().NumIn(), len(params)+2)
	}
	n.log.Debug("Calling Remote function...", zap.String("Function name", proxyFcn))
	res := f.CallSlice(in)

	n.log.Debug("Remote call finished", zap.String("method", proxyFcn), zap.Any("returnValues", [2]string{res[0].Type().String(), res[1].Type().String()}), zap.Any("error", res[1].Interface()))
	return res[0].Interface(), res[1].Interface()
}
