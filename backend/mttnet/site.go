// Package mttnet exposes the site functions to be exposed over p2p.
package mttnet

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"fmt"
	site "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet/sitesql"
	"mintter/backend/vcs/vcssql"
	"net/http"
	"net/url"
	"reflect"
	"runtime"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	rpcpeer "google.golang.org/grpc/peer"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type headerKey string

const (
	// MttHeader is the headers bearing the remote site hostname to proxy calls to.
	MttHeader headerKey = "x-mintter-site-hostname"
	// SiteAccountIDCtxKey is the key to pass the account id via context down to a proxied call
	// In initial site add, the account is not in the database and it needs to proxy to call redeemtoken.
	SiteAccountIDCtxKey headerKey = "x-mintter-site-account-id"
	// WellKnownPath is the path (to be completed with http(s)+domain) to call to get data from site.
	WellKnownPath = ".well-known"
)

// CreateInviteToken creates a new invite token for registering a new member.
func (srv *Server) CreateInviteToken(ctx context.Context, in *site.CreateInviteTokenRequest) (*site.InviteToken, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return &site.InviteToken{}, err
	}
	if proxied {
		retValue, ok := res.(*site.InviteToken)
		if !ok {
			return &site.InviteToken{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	if in.Role == site.Member_OWNER {
		return &site.InviteToken{}, fmt.Errorf("Cannot create owner token, please update the owner manually in site config")
	}
	// generate random number string for the token. Substitute for proper signed jwt
	newToken := randStr(12)

	if in.ExpireTime != nil && in.ExpireTime.AsTime().Before(time.Now()) {
		return &site.InviteToken{}, fmt.Errorf("expiration time must be in the future")
	}
	expirationTime := time.Now().Add(srv.InviteTokenExpirationDelay)
	if in.ExpireTime != nil {
		expirationTime = in.ExpireTime.AsTime()
	}

	n, ok := srv.Node.Get()
	if !ok {
		return &site.InviteToken{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.InviteToken{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	if err = sitesql.AddToken(conn, newToken, expirationTime, in.Role); err != nil {
		return &site.InviteToken{}, fmt.Errorf("Cannot add token to db: %w", err)
	}

	return &site.InviteToken{
		Token:      newToken,
		ExpireTime: &timestamppb.Timestamp{Seconds: expirationTime.Unix(), Nanos: int32(expirationTime.Nanosecond())},
	}, nil
}

// RedeemInviteToken redeems a previously created invite token to register a new member.
func (srv *Server) RedeemInviteToken(ctx context.Context, in *site.RedeemInviteTokenRequest) (*site.RedeemInviteTokenResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.RedeemInviteTokenResponse)
		if !ok {
			return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	if acc.String() == srv.ownerID {
		n.log.Debug("TOKEN REDEEMED", zap.String("Site Owner", srv.ownerID), zap.String("Role", "OWNER"))
		if err = sitesql.AddMember(conn, acc, int64(site.Member_OWNER)); err != nil {
			return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Cannot add owner member to the db %w", err)
		}
		return &site.RedeemInviteTokenResponse{Role: site.Member_OWNER}, nil
	}

	// check if that account already a member
	if in.Token == "" {
		role, err := sitesql.GetMemberRole(conn, acc)
		if err == nil {
			return &site.RedeemInviteTokenResponse{Role: role}, nil
		}
		if err = sitesql.AddMember(conn, acc, int64(site.Member_ROLE_UNSPECIFIED)); err != nil {
			return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Cannot add Member_ROLE_UNSPECIFIED member to the db %w", err)
		}
		return &site.RedeemInviteTokenResponse{Role: site.Member_ROLE_UNSPECIFIED}, nil
	}

	tokenInfo, err := sitesql.GetToken(conn, in.Token)
	if err != nil {
		n.log.Debug("TOKEN NOT VALID", zap.String("Provided token", in.Token), zap.Error(err))
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("token not valid (nonexisting, already redeemed or expired)")
	}

	if tokenInfo.ExpirationTime.Before(time.Now()) {
		_ = sitesql.RemoveToken(conn, in.Token)
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("expired token")
	}

	// redeem the token
	if err = sitesql.RemoveToken(conn, in.Token); err != nil {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Could not redeem the token %w", err)
	}

	// We upsert the new role
	if err = sitesql.AddMember(conn, acc, int64(tokenInfo.Role)); err != nil {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Cannot add owner member to the db %w", err)
	}

	n.log.Debug("TOKEN REDEEMED", zap.String("Caller account", acc.String()), zap.String("Site Owner", srv.ownerID), zap.String("Role", "EDITOR"))
	return &site.RedeemInviteTokenResponse{Role: tokenInfo.Role}, nil
}

// GetSiteInfo Gets public-facing site information.
func (srv *Server) GetSiteInfo(ctx context.Context, in *site.GetSiteInfoRequest) (*site.SiteInfo, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.SiteInfo{}, err
	}
	if proxied {
		retValue, ok := res.(*site.SiteInfo)
		if !ok {
			return &site.SiteInfo{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return &site.SiteInfo{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.SiteInfo{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	//make GetSiteTitle that returns "" when does not find the title tag
	title, err := sitesql.GetSiteTitle(conn)
	if err != nil {
		return &site.SiteInfo{}, fmt.Errorf("Could not get title")
	}
	//make GetSiteDescription that returns "" when does not find the description tag
	description, err := sitesql.GetSiteDescription(conn)
	if err != nil {
		return &site.SiteInfo{}, fmt.Errorf("Could not get title")
	}
	return &site.SiteInfo{
		Hostname:    srv.hostname,
		Title:       title,
		Description: description,
		Owner:       srv.ownerID,
	}, nil
}

// UpdateSiteInfo updates public-facing site information. Doesn't support partial updates, hence all the fields must be provided.
func (srv *Server) UpdateSiteInfo(ctx context.Context, in *site.UpdateSiteInfoRequest) (*site.SiteInfo, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return &site.SiteInfo{}, err
	}
	if proxied {
		retValue, ok := res.(*site.SiteInfo)
		if !ok {
			return &site.SiteInfo{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return &site.SiteInfo{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.SiteInfo{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()

	ret := site.SiteInfo{Hostname: srv.hostname,
		Owner: srv.ownerID}
	if in.Title != "" {
		if err = sitesql.SetSiteTitle(conn, in.Title); err != nil {
			return &site.SiteInfo{}, fmt.Errorf("Could not set new title: %w", err)
		}
		ret.Title = in.Title
	}
	if in.Description != "" {
		if err = sitesql.SetSiteDescription(conn, in.Description); err != nil {
			return &site.SiteInfo{}, fmt.Errorf("Could not set new description: %w", err)
		}
		ret.Description = in.Description
	}

	return &ret, nil
}

// ListMembers lists registered members on the site.
func (srv *Server) ListMembers(ctx context.Context, in *site.ListMembersRequest) (*site.ListMembersResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.ListMembersResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.ListMembersResponse)
		if !ok {
			return &site.ListMembersResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var members []*site.Member
	n, ok := srv.Node.Get()
	if !ok {
		return &site.ListMembersResponse{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.ListMembersResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	memberList, err := sitesql.ListMembers(conn)
	if err != nil {
		return &site.ListMembersResponse{}, fmt.Errorf("Cannot get site members: %w", err)
	}
	for accID, role := range memberList {
		members = append(members, &site.Member{
			AccountId: accID.String(),
			Role:      role,
		})
	}
	return &site.ListMembersResponse{Members: members}, nil
}

// GetMember gets information about a specific member.
func (srv *Server) GetMember(ctx context.Context, in *site.GetMemberRequest) (*site.Member, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.Member{}, err
	}
	if proxied {
		retValue, ok := res.(*site.Member)
		if !ok {
			return &site.Member{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return &site.Member{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.Member{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	accCID, err := cid.Decode(in.AccountId)
	if err != nil {
		return &site.Member{}, fmt.Errorf("Provided account id [%s] not a valid cid: %w", in.AccountId, err)
	}
	role, err := sitesql.GetMemberRole(conn, accCID)
	if err != nil {
		return &site.Member{}, fmt.Errorf("Member not found")
	}
	return &site.Member{AccountId: in.AccountId, Role: role}, nil
}

// DeleteMember deletes an existing member.
func (srv *Server) DeleteMember(ctx context.Context, in *site.DeleteMemberRequest) (*emptypb.Empty, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return &emptypb.Empty{}, err
	}
	if proxied {
		retValue, ok := res.(*emptypb.Empty)
		if !ok {
			return &emptypb.Empty{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}

	n, ok := srv.Node.Get()
	if !ok {
		return &emptypb.Empty{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &emptypb.Empty{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	accCID, err := cid.Decode(in.AccountId)
	if err != nil {
		return &emptypb.Empty{}, fmt.Errorf("Provided account id [%s] not a valid cid: %w", in.AccountId, err)
	}
	roleToDelete, err := sitesql.GetMemberRole(conn, accCID)
	if err != nil {
		return &emptypb.Empty{}, fmt.Errorf("Member not found")
	}

	if roleToDelete == site.Member_OWNER {
		return &emptypb.Empty{}, fmt.Errorf("Site owner cannot be deleted, please, change it manually in site config")
	}
	if err = sitesql.RemoveMember(conn, accCID); err != nil {
		return &emptypb.Empty{}, fmt.Errorf("Could not remove provided member [%s]: %w", in.AccountId, err)
	}

	return &emptypb.Empty{}, nil
}

// PublishDocument publishes and pins the document to the public web site.
func (srv *Server) PublishDocument(ctx context.Context, in *site.PublishDocumentRequest) (*site.PublishDocumentResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.PublishDocumentResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.PublishDocumentResponse)
		if !ok {
			return &site.PublishDocumentResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	_, err = url.Parse(in.Path)
	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Path [%s] is not a valid path", in.Path)
	}
	// TODO(juligasa): call getPublication on the site for the document published and all of the referenced documents
	// GetPublication is going to call discover object that calls sync, and it'll sync everything. Instead, since site and editor already connected, call
	// a new function to pull the document directly from the editor, without syncyng
	/*doc, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{DocumentId: in.DocumentId, Version: in.Version, LocalOnly: false})
	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Cannot pull document [%s] version [%s]", in.DocumentId, in.Version)
	}
	*/
	// If path already taken, we update in case doc_ids match (just updating the version) error otherwise

	n, ok := srv.Node.Get()
	if !ok {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()

	docID, err := cid.Decode(in.DocumentId)
	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Provided Document id [%s] is not valid: %w", in.DocumentId, err)
	}

	_, err = srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
		DocumentId: in.DocumentId,
		Version:    in.Version,
		LocalOnly:  true,
	})

	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Couldn't find the actual document + version to publish in the database: %w", err)
	}

	record, err := sitesql.GetWebPublicationRecordByPath(conn, in.Path)
	if err == nil {
		if record.Document.ID.String() == in.DocumentId && record.Document.Version == in.Version {
			return &site.PublishDocumentResponse{}, fmt.Errorf("Provided document+version already exists in path [%s]", in.Path)
		}
		if record.Document.ID.String() != in.DocumentId {
			return &site.PublishDocumentResponse{}, fmt.Errorf("Path [%s] already taken by a different Document ID", in.Path)
		}
		if err = sitesql.RemoveWebPublicationRecord(conn, record.Document.ID, record.Document.Version); err != nil {
			return &site.PublishDocumentResponse{}, fmt.Errorf("Could not remove previous version [%s] in the same path: %w", record.Document.Version, err)
		}
	}

	if err = sitesql.AddWebPublicationRecord(conn, docID, in.Version, in.Path); err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Could not insert document in path [%s]: %w", in.Path, err)
	}
	return &site.PublishDocumentResponse{}, nil
}

// UnpublishDocument un-publishes (un-lists) a given document. Only the author of that document or the owner can unpublish.
func (srv *Server) UnpublishDocument(ctx context.Context, in *site.UnpublishDocumentRequest) (*site.UnpublishDocumentResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.UnpublishDocumentResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.UnpublishDocumentResponse)
		if !ok {
			return &site.UnpublishDocumentResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return &site.UnpublishDocumentResponse{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.UnpublishDocumentResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	docID, err := cid.Decode(in.DocumentId)
	if err != nil {
		return &site.UnpublishDocumentResponse{}, fmt.Errorf("Provided document ID [%s] is in valid: %w", in.DocumentId, err)
	}
	records, err := sitesql.GetWebPublicationRecordsByID(conn, docID)
	if err != nil {
		return &site.UnpublishDocumentResponse{}, fmt.Errorf("Cannot unpublish: %w", err)
	}
	for _, record := range records {
		if record.Document.ID.String() == in.DocumentId && (in.Version == "" || in.Version == record.Document.Version) {
			doc, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
				DocumentId: record.Document.ID.String(),
				Version:    record.Document.Version,
				LocalOnly:  true,
			})
			if err != nil {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("Couldn't find the actual document to unpublish although it was found in the database: %w", err)
			}
			docAcc, err := cid.Decode(doc.Document.Author)
			if err != nil {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("Couldn't parse doc cid: %w", err)
			}
			if acc.String() != docAcc.String() && srv.ownerID != acc.String() {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("You are not the author of the document, nor site owner")
			}
			if err = sitesql.RemoveWebPublicationRecord(conn, record.Document.ID, record.Document.Version); err != nil {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("Couldn't remove document [%s]: %w", record.Document.ID.String(), err)
			}
		}
	}
	return &site.UnpublishDocumentResponse{}, nil
}

// ListWebPublications lists all the published documents.
func (srv *Server) ListWebPublications(ctx context.Context, in *site.ListWebPublicationsRequest) (*site.ListWebPublicationsResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.ListWebPublicationsResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.ListWebPublicationsResponse)
		if !ok {
			return &site.ListWebPublicationsResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var publications []*site.WebPublicationRecord
	n, ok := srv.Node.Get()
	if !ok {
		return &site.ListWebPublicationsResponse{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.ListWebPublicationsResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	records, err := sitesql.ListWebPublicationRecords(conn)
	if err != nil {
		return &site.ListWebPublicationsResponse{}, fmt.Errorf("Cannot List publications: %w", err)
	}
	for document, path := range records {
		publications = append(publications, &site.WebPublicationRecord{
			DocumentId: document.ID.String(),
			Version:    document.Version,
			Hostname:   srv.hostname,
			Path:       path,
		})
	}
	return &site.ListWebPublicationsResponse{Publications: publications}, nil
}

// GetPath gets a publication given the path it has been publish to.
func (srv *Server) GetPath(ctx context.Context, in *site.GetPathRequest) (*site.GetPathResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.GetPathResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.GetPathResponse)
		if !ok {
			return &site.GetPathResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}

	n, ok := srv.Node.Get()
	if !ok {
		return &site.GetPathResponse{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.GetPathResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	record, err := sitesql.GetWebPublicationRecordByPath(conn, in.Path)
	if err != nil {
		return &site.GetPathResponse{}, fmt.Errorf("Could not get record for path [%s]: %w", in.Path, err)
	}
	ret, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
		DocumentId: record.Document.ID.String(),
		LocalOnly:  true,
	})
	if err != nil {
		return &site.GetPathResponse{}, fmt.Errorf("Could not get local document although was found in the list of published documents: %w", err)
	}
	return &site.GetPathResponse{Publication: ret}, err
}

func getRemoteSiteFromHeader(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", fmt.Errorf("There is no metadata provided in context")
	}
	token := md.Get(string(MttHeader))
	if len(token) != 1 {
		return "", fmt.Errorf("Header [%s] not found in metadata", MttHeader)
	}
	return token[0], nil
}

// getRemoteID gets the remote peer id if there is an opened p2p connection between them with context ctx.
func getRemoteID(ctx context.Context) (cid.Cid, error) {
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		return cid.Cid{}, fmt.Errorf("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return cid.Cid{}, err
	}

	return peer.ToCid(pid), nil
}

func randStr(length int) string {
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(err)
	}
	return base32.StdEncoding.EncodeToString(randomBytes)[:length]
}

// Client dials a remote peer if necessary and returns the RPC client handle.
func (srv *Server) Client(ctx context.Context, device cid.Cid) (site.WebSiteClient, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	pid, err := peer.FromCid(device)
	if err != nil {
		return nil, err
	}

	if err := n.Connect(ctx, n.p2p.Peerstore().PeerInfo(pid)); err != nil {
		return nil, err
	}
	return n.client.DialSite(ctx, pid)
}

func (srv *Server) checkPermissions(ctx context.Context, requiredRole site.Member_Role, params ...interface{}) (cid.Cid, bool, interface{}, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return cid.Cid{}, false, nil, fmt.Errorf("Node not ready yet")
	}

	remoteHostname, err := getRemoteSiteFromHeader(ctx)
	if err != nil && srv.hostname == "" { // no headers and not a site
		return cid.Cid{}, false, nil, fmt.Errorf("This node is not a site, please provide a proper headers to proxy the call to a remote site: %w", err)
	}

	acc := n.me.AccountID()
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
		n.log.Debug("Headers found, meaning this call should be proxied and authentication will take place at the remote site", zap.String(string(MttHeader), remoteHostname))

		pc, _, _, _ := runtime.Caller(1)
		proxyFcnList := strings.Split(runtime.FuncForPC(pc).Name(), ".")
		proxyFcn := proxyFcnList[len(proxyFcnList)-1]
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
		remoteDeviceID, err := getRemoteID(ctx)
		if err == nil {
			// this would mean this is a proxied call so we take the account from the remote caller ID
			remotAcc, err := n.AccountForDevice(ctx, remoteDeviceID)
			if err != nil {
				return cid.Cid{}, false, nil, fmt.Errorf("couldn't get account ID from device ID: %w", err)
			}

			n.log.Debug("PROXIED CALL", zap.String("Local AccountID", acc.String()), zap.String("Remote AccountID", remotAcc.String()), zap.Error(err))
			acc = remotAcc
		} else {
			// this would mean we cannot get remote ID it must be a local call
			n.log.Debug("LOCAL CALL", zap.String("Local AccountID", acc.String()), zap.String("remoteHostname", remoteHostname), zap.Error(err))
		}
	}

	if requiredRole == site.Member_OWNER && acc.String() != srv.ownerID {
		return cid.Cid{}, false, nil, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
	} else if requiredRole == site.Member_EDITOR && acc.String() != srv.ownerID {
		conn, cancel, err := n.vcs.DB().Conn(ctx)
		if err != nil {
			return cid.Cid{}, false, nil, fmt.Errorf("Cannot connect to internal db: %w", err)
		}
		defer cancel()

		role, err := sitesql.GetMemberRole(conn, acc)
		if err != nil || role != requiredRole {
			return cid.Cid{}, false, nil, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
		}
	}
	return acc, false, nil, nil
}

// ServeHTTP serves the content for the well-known path.
func (srv *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	encoder := json.NewEncoder(w)
	w.Header().Set("Content-Type", "application/json")
	var siteInfo wellKnownInfo
	n, ok := srv.Node.Get()
	if !ok {
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = encoder.Encode("Error: site p2p node not ready yet")
		return
	}

	siteInfo.AccountID = n.me.AccountID().String()

	pid := n.me.DeviceKey().ID()
	addrinfo := n.Libp2p().Peerstore().PeerInfo(pid)
	mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = encoder.Encode("Error: failed to get own site addresses")
		return
	}

	for _, addr := range mas {
		siteInfo.Addresses = append(siteInfo.Addresses, addr.String())
	}
	_ = encoder.Encode(siteInfo)
}

// proxyToSite calls a remote site function over libp2p.
func (srv *Server) proxyToSite(ctx context.Context, hostname string, proxyFcn string, params ...interface{}) (interface{}, interface{}) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Can't proxy. Local p2p node not ready yet")
	}
	var siteAccount string
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer cancel()
	site, err := sitesql.GetSite(conn, hostname)
	if err == nil {
		siteAccount = site.AccID.String()
	}

	if err != nil { // Could be an add site call to proxy in which case the site does not exists yet
		siteAccountCtx := ctx.Value(SiteAccountIDCtxKey)
		if siteAccountCtx == nil {
			return nil, fmt.Errorf("Cannot get site accountID: %w", err)
		}
		siteAccount, ok = siteAccountCtx.(string)
		if !ok {
			return nil, fmt.Errorf("Cannot get site accountID")
		}
	}

	conn, release, err := n.VCS().DB().Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
	}
	defer release()

	all, err := vcssql.ListAccountDevices(conn)
	if err != nil {
		n.log.Debug("couldn't list devices", zap.String("msg", err.Error()))
		return nil, fmt.Errorf("couldn't list devices from account ID %s", siteAccount)
	}

	siteAccountID, err := cid.Decode(siteAccount)
	if err != nil {
		return nil, fmt.Errorf("Could not decode site account ID: %w", err)
	}
	devices, found := all[siteAccountID]
	if !found {
		return nil, fmt.Errorf("couldn't find devices information of the account %s. Please connect to the remote peer first ", siteAccount)
	}
	remoteHostname, _ := getRemoteSiteFromHeader(ctx)
	ctx = metadata.AppendToOutgoingContext(ctx, string(MttHeader), remoteHostname)
	for _, deviceID := range devices {
		sitec, err := srv.Client(ctx, deviceID)
		if err != nil {
			continue
		}

		n.log.Debug("Remote site contacted, now try to call a remote function", zap.String("Function name", proxyFcn))

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
		res := f.CallSlice(in)
		n.log.Debug("Remote call finished successfully", zap.String("First param type", res[0].Kind().String()), zap.String("Second param type", res[1].Kind().String()))
		return res[0].Interface(), res[1].Interface()
	}
	return nil, fmt.Errorf("none of the devices associated with the provided account were reachable")
}
