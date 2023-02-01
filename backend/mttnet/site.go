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
	rpcpeer "google.golang.org/grpc/peer"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CreateInviteToken creates a new invite token for registering a new member.
func (srv *Server) CreateInviteToken(ctx context.Context, in *site.CreateInviteTokenRequest) (*site.InviteToken, error) {
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
	n, ok := srv.Node.Get()
	if !ok {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Node not ready yet")
	}
	remoteDeviceID, err := getRemoteID(ctx)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, err
	}
	acc, err := n.AccountForDevice(ctx, remoteDeviceID)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, err
	}
	if in.AccountId != "" && acc.String() != in.AccountId {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("provided account ID does not match with observed p2p accountID")
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
	return &site.RedeemInviteTokenResponse{}, nil
}

// GetSiteInfo Gets public-facing site information.
func (srv *Server) GetSiteInfo(ctx context.Context, in *site.GetSiteInfoRequest) (*site.SiteInfo, error) {
	return &site.SiteInfo{}, fmt.Errorf("Endpoint not implemented yet")
}

// UpdateSiteInfo updates public-facing site information. Doesn't support partial updates, hence all the fields must be provided.
func (srv *Server) UpdateSiteInfo(ctx context.Context, in *site.UpdateSiteInfoRequest) (*site.SiteInfo, error) {
	return &site.SiteInfo{}, fmt.Errorf("Endpoint not implemented yet")
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

// PublishDocument publishes and lists the document to the public web site.
func (srv *Server) PublishDocument(ctx context.Context, in *site.PublishDocumentRequest) (*site.PublishDocumentResponse, error) {
	device, err := getRemoteID(ctx)
	if err != nil {
		return nil, err
	}
	role, err := srv.getDeviceRole(ctx, device)
	if err != nil {
		return &site.PublishDocumentResponse{}, err
	}
	if role == site.Member_ROLE_UNSPECIFIED {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Your current role does not allow you to publish")
	}
	return &site.PublishDocumentResponse{}, nil
}

// UnpublishDocument un-publishes (un-lists) a given document.
func (srv *Server) UnpublishDocument(ctx context.Context, in *site.UnpublishDocumentRequest) (*site.UnpublishDocumentResponse, error) {
	return &site.UnpublishDocumentResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// ListWebPublications lists all the published documents.
func (srv *Server) ListWebPublications(ctx context.Context, in *site.ListWebPublicationsRequest) (*site.ListWebPublicationsResponse, error) {
	return &site.ListWebPublicationsResponse{}, fmt.Errorf("Endpoint not implemented yet")
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

func (srv *Server) getDeviceRole(ctx context.Context, remoteDeviceID cid.Cid) (site.Member_Role, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return site.Member_ROLE_UNSPECIFIED, fmt.Errorf("Node not ready yet")
	}
	acc, err := n.AccountForDevice(ctx, remoteDeviceID)
	if err != nil {
		return site.Member_ROLE_UNSPECIFIED, err
	}

	role, ok := srv.accountsDB[acc.String()]
	if !ok {
		return site.Member_ROLE_UNSPECIFIED, nil
	}
	return role, nil
}

func randStr(length int) string {
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(err)
	}
	return base32.StdEncoding.EncodeToString(randomBytes)[:length]
}
