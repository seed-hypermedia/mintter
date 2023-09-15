// Package mttnet exposes the site functions to be exposed over p2p.
package mttnet

import (
	"context"
	"fmt"
	"mintter/backend/core"
	sitesV2 "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet/sitesql"
	"net/http"
	"strings"

	"github.com/libp2p/go-libp2p/core/peer"
)

const (
	// OwnerAccountHeader is the key to get the account id of the site's owner out of http response headers.
	OwnerAccountHeader = "x-mintter-site-owner-account"
	// GroupIDHeader is the key to get the group id of the group served on the site.
	GroupIDHeader = "x-mintter-site-group-id"
	// P2PAddresses is the key to get the p2p addresses to connect to that site via p2p.
	P2PAddresses = "x-mintter-site-p2p-addresses"
)

// CreateSite creates a site from a group.
func (srv *Server) CreateSite(ctx context.Context, in *sitesV2.CreateSiteRequest) (*sitesV2.CreateSiteResponse, error) {
	n, err := srv.Node.Await(ctx)
	if err != nil {
		return nil, fmt.Errorf("node is not ready yet: %w", err)
	}
	remoteDeviceID, err := getRemoteID(ctx)

	var remoteAcc core.Principal
	if err != nil {
		return nil, fmt.Errorf("Only remote calls accepted: %w", err)
	}

	remoteAcc, err = n.AccountForDevice(ctx, remoteDeviceID)
	if err != nil {
		return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
	}

	conn, release, err := n.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	link, err := sitesql.GetSiteRegistrationLink(conn)
	if err != nil {
		return nil, err
	}

	if link.KVValue != in.Link {
		return nil, fmt.Errorf("Provided link not valid")
	}

	hostname := strings.Split(in.Link, "/secret-invite/")[0]

	_, err = hypersql.EntitiesInsertOrIgnore(conn, in.GroupId)
	if err != nil {
		return nil, err
	}

	if err := sitesql.RegisterSite(conn, hostname, in.GroupId, in.Version, remoteAcc); err != nil {
		return nil, err
	}

	return &sitesV2.CreateSiteResponse{
		OwnerId: remoteAcc.String(),
		GroupId: in.GroupId,
	}, nil
}

// GetSiteAddressFromHeaders gets peer information from site http response headers.
func GetSiteAddressFromHeaders(SiteHostname string) (peer.AddrInfo, error) {
	var resp peer.AddrInfo
	req, err := http.NewRequest(http.MethodGet, SiteHostname, nil)
	if err != nil {
		return resp, fmt.Errorf("could not create request to [%s] site: %w ", SiteHostname, err)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return resp, fmt.Errorf("could not contact provided site [%s]: %w ", SiteHostname, err)
	}
	defer res.Body.Close()

	addresses := res.Header.Get(P2PAddresses)
	if addresses == "" {
		return resp, fmt.Errorf("headers [%s] not present in http response", P2PAddresses)
	}
	resp, err = AddrInfoFromStrings(strings.Split(strings.Replace(addresses, " ", "", -1), ",")...)
	if err != nil {
		return resp, fmt.Errorf("Couldn't parse multiaddress [%s]: %w", addresses, err)
	}
	return resp, nil
}
