// Package mttnet exposes the site functions to be exposed over p2p.
package mttnet

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"fmt"
	site "mintter/backend/genproto/documents/v1alpha"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/metadata"
	rpcpeer "google.golang.org/grpc/peer"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	// MttHeader is the headers bearing the remote site hostname to proxy calls to.
	MttHeader = "x-mintter-site-hostname"
)

// CreateInviteToken creates a new invite token for registering a new member.
func (srv *Server) CreateInviteToken(ctx context.Context, in *site.CreateInviteTokenRequest) (*site.InviteToken, error) {
	if _, err := srv.checkPermissions(ctx, site.Member_OWNER); err != nil {
		return &site.InviteToken{}, err
	}

	// generate random number string for the token. Substitute for proper signed jwt
	randomStr := randStr(6)
	var newToken = srv.hostname + ":" + randomStr

	if in.ExpireTime != nil && in.ExpireTime.AsTime().Before(time.Now()) {
		return &site.InviteToken{}, fmt.Errorf("expiration time must be in the future")
	}
	expirationTime := time.Now().Add(srv.InviteTokenExpirationDelay)
	if in.ExpireTime != nil {
		expirationTime = in.ExpireTime.AsTime()
	}

	srv.tokensDB[newToken] = tokenInfo{
		role:           in.Role,
		expirationTime: expirationTime,
	}

	return &site.InviteToken{
		Token:      newToken,
		ExpireTime: &timestamppb.Timestamp{Seconds: expirationTime.UnixNano(), Nanos: int32(expirationTime.Unix())},
	}, nil
}

// RedeemInviteToken redeems a previously created invite token to register a new member.
func (srv *Server) RedeemInviteToken(ctx context.Context, in *site.RedeemInviteTokenRequest) (*site.RedeemInviteTokenResponse, error) {
	acc, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, err
	}

	if in.Token == "" { // TODO(juligasa) substitute with proper regexp match
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("invalid token format")
	}

	tokenInfo, valid := srv.tokensDB[in.Token]
	if !valid {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("token not valid (nonexisting, already redeemed or expired)")
	}

	if tokenInfo.expirationTime.Before(time.Now()) {
		delete(srv.tokensDB, in.Token)
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("expired token")
	}
	// redeem the token
	delete(srv.tokensDB, in.Token)

	// We upsert the new role
	srv.accountsDB[acc.String()] = tokenInfo.role
	return &site.RedeemInviteTokenResponse{Role: tokenInfo.role}, nil
}

// GetSiteInfo Gets public-facing site information.
func (srv *Server) GetSiteInfo(ctx context.Context, in *site.GetSiteInfoRequest) (*site.SiteInfo, error) {
	_, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED)
	if err != nil {
		return &site.SiteInfo{}, err
	}
	return &site.SiteInfo{
		Hostname:    srv.hostname,
		Title:       srv.title,
		Description: srv.description,
		Owner:       srv.ownerID,
	}, nil
}

// UpdateSiteInfo updates public-facing site information. Doesn't support partial updates, hence all the fields must be provided.
func (srv *Server) UpdateSiteInfo(ctx context.Context, in *site.UpdateSiteInfoRequest) (*site.SiteInfo, error) {
	_, err := srv.checkPermissions(ctx, site.Member_OWNER)
	if err != nil {
		return &site.SiteInfo{}, err
	}
	if in.Title != "" {
		srv.title = in.Title
	}
	if in.Description != "" {
		srv.description = in.Description
	}

	return &site.SiteInfo{
		Hostname:    srv.hostname,
		Title:       srv.title,
		Description: srv.description,
		Owner:       srv.ownerID,
	}, nil
}

// ListMembers lists registered members on the site.
func (srv *Server) ListMembers(ctx context.Context, in *site.ListMembersRequest) (*site.ListMembersResponse, error) {
	return &site.ListMembersResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// GetMember gets information about a specific member.
func (srv *Server) GetMember(ctx context.Context, in *site.GetMemberRequest) (*site.Member, error) {
	return &site.Member{}, fmt.Errorf("Endpoint not implemented yet")
}

// DeleteMember deletes an existing member.
func (srv *Server) DeleteMember(ctx context.Context, in *site.DeleteMemberRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, fmt.Errorf("Endpoint not implemented yet")
}

// PublishDocument publishes and pins the document to the public web site.
func (srv *Server) PublishDocument(ctx context.Context, in *site.PublishDocumentRequest) (*site.PublishDocumentResponse, error) {
	_, err := srv.checkPermissions(ctx, site.Member_EDITOR)
	if err != nil {
		return &site.PublishDocumentResponse{}, err
	}

	var refs []docInfo
	for _, ref := range in.ReferencedDocuments {
		refs = append(refs, docInfo{ID: ref.DocumentId, Version: ref.Version})
	}

	srv.WebPublicationRecordDB[randStr(8)] = PublicationRecord{
		Document:   docInfo{ID: in.DocumentId, Version: in.Version},
		Path:       in.Path,
		Hostname:   srv.hostname,
		References: refs,
	}
	return &site.PublishDocumentResponse{}, nil
}

// UnpublishDocument un-publishes (un-lists) a given document.
func (srv *Server) UnpublishDocument(ctx context.Context, in *site.UnpublishDocumentRequest) (*site.UnpublishDocumentResponse, error) {
	_, err := srv.checkPermissions(ctx, site.Member_OWNER)
	if err != nil {
		return &site.UnpublishDocumentResponse{}, err
	}
	for key, record := range srv.WebPublicationRecordDB {
		if record.Document.ID == in.DocumentId && (in.Version == "" || in.Version == record.Document.Version) {
			delete(srv.WebPublicationRecordDB, key)
		}
	}

	return &site.UnpublishDocumentResponse{}, nil
}

// ListWebPublications lists all the published documents.
func (srv *Server) ListWebPublications(ctx context.Context, in *site.ListWebPublicationsRequest) (*site.ListWebPublicationsResponse, error) {
	_, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED)
	if err != nil {
		return &site.ListWebPublicationsResponse{}, err
	}
	var publications []*site.WebPublicationRecord
	for _, record := range srv.WebPublicationRecordDB {
		publications = append(publications, &site.WebPublicationRecord{
			DocumentId: record.Document.ID,
			Version:    record.Document.Version,
			Hostname:   srv.hostname,
			Path:       record.Path,
		})
	}
	return &site.ListWebPublicationsResponse{Publications: publications}, nil
}

// GetPath gets a publication given the path it has been publish to.
func (srv *Server) GetPath(ctx context.Context, in *site.GetPathRequest) (*site.GetPathResponse, error) {
	_, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED)
	if err != nil {
		return &site.GetPathResponse{}, err
	}
	ret := &site.Publication{}
	// TODO(juligasa): replace with a proper remote call to all known sites in the api.sitesDB
	err = fmt.Errorf("No publication was found in provided path")
	for _, v := range srv.WebPublicationRecordDB { // we first look in the db because we may have the document but was unpublished (removed from the database but not from the storage)
		if in.Path == v.Path {
			ret, err = srv.publicationGetter.GetPublication(ctx, &site.GetPublicationRequest{
				DocumentId: v.Document.ID,
				LocalOnly:  true,
			})
			if err != nil {
				return &site.GetPathResponse{}, fmt.Errorf("Could not get local document although was found in the list of published documents: %w", err)
			}
			break
		}
	}
	return &site.GetPathResponse{Publication: ret}, err
}

func getRemoteSiteFromHeader(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", fmt.Errorf("metadata not found in context")
	}
	token := md.Get(MttHeader)
	if len(token) != 1 {
		return "", fmt.Errorf("wrong metadata format")
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

func (srv *Server) checkPermissions(ctx context.Context, requiredRole site.Member_Role) (cid.Cid, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return cid.Cid{}, fmt.Errorf("Node not ready yet")
	}
	remoteHostname, err := getRemoteSiteFromHeader(ctx)
	if err != nil && srv.hostname == "" { // no headers and not a local site
		return cid.Cid{}, fmt.Errorf("This node is not a site, please provide a proper headers to proxy the call to a proper remote site")
	}
	//if err == nil && srv.hostname != remoteHostname {
	// proxy to remote
	// return &site.InviteToken{}, fmt.Errorf("Remote proxying not ready yet. Please remove header to make it a local call")
	//}
	acc := n.me.AccountID()

	if srv.hostname == remoteHostname { // proxyed call
		remoteDeviceID, err := getRemoteID(ctx)
		if err != nil {
			return cid.Cid{}, fmt.Errorf("couldn't get remote device ID from p2p context: %w", err)
		}
		acc, err = n.AccountForDevice(ctx, remoteDeviceID)
		if err != nil {
			return cid.Cid{}, fmt.Errorf("couldn't get account ID from device ID: %w", err)
		}
	}

	if requiredRole == site.Member_OWNER && acc.String() != srv.ownerID {
		return cid.Cid{}, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
	} else if requiredRole == site.Member_EDITOR && acc.String() != srv.ownerID {
		role, ok := srv.Site.accountsDB[acc.String()]
		if !ok || (ok && role != requiredRole) {
			return cid.Cid{}, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
		}
	}
	return acc, nil
}
