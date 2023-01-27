// site functions to be exposed over p2p network
package mttnet

import (
	"context"
	"fmt"
	site "mintter/backend/genproto/site/v1alpha"

	emptypb "google.golang.org/protobuf/types/known/emptypb"
)

// CreateInviteToken creates a new invite token for registering a new member.
func (n *rpcHandler) CreateInviteToken(ctx context.Context, in *site.CreateInviteTokenRequest) (*site.InviteToken, error) {
	return &site.InviteToken{}, fmt.Errorf("Endpoint not implemented yet")
}

// RedeemInviteToken redeems a previously created invite token to register a new member.
func (n *rpcHandler) RedeemInviteToken(ctx context.Context, in *site.RedeemInviteTokenRequest) (*site.RedeemInviteTokenResponse, error) {
	return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// GetSiteInfo Gets public-facing site information.
func (n *rpcHandler) GetSiteInfo(ctx context.Context, in *site.GetSiteInfoRequest) (*site.SiteInfo, error) {
	return &site.SiteInfo{}, fmt.Errorf("Endpoint not implemented yet")
}

// UpdateSiteInfo updates public-facing site information. Doesn't support partial updates, hence all the fields must be provided.
func (n *rpcHandler) UpdateSiteInfo(ctx context.Context, in *site.UpdateSiteInfoRequest) (*site.SiteInfo, error) {
	return &site.SiteInfo{}, fmt.Errorf("Endpoint not implemented yet")
}

// ListMembers lists registered members on the site.
func (n *rpcHandler) ListMembers(ctx context.Context, in *site.ListMembersRequest) (*site.ListMembersResponse, error) {
	return &site.ListMembersResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// GetMember gets information about a specific member.
func (n *rpcHandler) GetMember(ctx context.Context, in *site.GetMemberRequest) (*site.Member, error) {
	return &site.Member{}, fmt.Errorf("Endpoint not implemented yet")
}

// DeleteMember deletes an existing member.
func (n *rpcHandler) DeleteMember(ctx context.Context, in *site.DeleteMemberRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, fmt.Errorf("Endpoint not implemented yet")
}

// ListBlockedAccounts lists currently blocked Mintter Accounts.
func (n *rpcHandler) ListBlockedAccounts(ctx context.Context, in *site.ListBlockedAccountsRequest) (*site.ListBlockedAccountsResponse, error) {
	return &site.ListBlockedAccountsResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// Publish publishes and lists the document to the public web site.
func (n *rpcHandler) Publish(ctx context.Context, in *site.PublishRequest) (*site.PublishResponse, error) {
	return &site.PublishResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// Unpublish un-publishes (unlists) the document.
func (n *rpcHandler) Unpublish(ctx context.Context, in *site.UnpublishRequest) (*site.UnpublishResponse, error) {
	return &site.UnpublishResponse{}, fmt.Errorf("Endpoint not implemented yet")
}

// ListWebPublications lists all the published documents.
func (n *rpcHandler) ListWebPublications(ctx context.Context, in *site.ListWebPublicationsRequest) (*site.ListWebPublicationsResponse, error) {
	return &site.ListWebPublicationsResponse{}, fmt.Errorf("Endpoint not implemented yet")
}
