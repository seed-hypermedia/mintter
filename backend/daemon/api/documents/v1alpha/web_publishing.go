// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	context "context"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/mttnet/sitesql"
	"net/http"
	"strings"

	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/emptypb"
)

// AddSite checks if the provided site hostname is a valid Mintter site and if so, add it to the database.
func (api *Server) AddSite(ctx context.Context, in *documents.AddSiteRequest) (*documents.SiteConfig, error) {
	ret := documents.SiteConfig{
		Hostname: "",
		Role:     documents.Member_ROLE_UNSPECIFIED,
	}
	if in.Hostname == "" {
		return &ret, fmt.Errorf("add site: Empty hostname provided")
	}
	if strings.Contains(strings.ToLower(in.Hostname), "notallow") {
		return &ret, fmt.Errorf("add site: Site " + in.Hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(in.Hostname), "taken") {
		return &ret, fmt.Errorf("add site: Site " + in.Hostname + " already taken")
	}

	requestURL := fmt.Sprintf("%s/%s", in.Hostname, mttnet.WellKnownPath)

	req, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return &ret, fmt.Errorf("add site: Could not create request to well-known site: %w ", err)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return &ret, fmt.Errorf("add site: Could not contact to provided site [%s]: %w ", requestURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return &ret, fmt.Errorf("add site: Site info url [%s] not working. Status code: %d", requestURL, res.StatusCode)
	}
	var response map[string]interface{}
	err = json.NewDecoder(res.Body).Decode(&response)
	if err != nil {
		return &ret, fmt.Errorf("add site: Unrecognized response format %w", err)
	}
	addressesRes, ok := response["addresses"]
	if !ok {
		return &ret, fmt.Errorf("add site: Address not found in payload")
	}

	var addresses []string
	addressesList, ok := addressesRes.([]interface{})
	if !ok {
		return &ret, fmt.Errorf("add site: Error getting p2p addresses from site, wrong format: addresses must be a list of multiaddresses even if only one provided")
	}
	for _, addrs := range addressesList {
		addr, ok := addrs.(string)
		if !ok {
			return &ret, fmt.Errorf("add site: Error getting p2p addresses from site, wrong format: individual multiaddresses must be a string")
		}
		addresses = append(addresses, addr)
	}

	accountRes, ok := response["account_id"]
	if !ok {
		return &ret, fmt.Errorf("add site: account_id not found in payload")
	}

	accountID, ok := accountRes.(string)
	if !ok {
		return &ret, fmt.Errorf("add site: Error getting account_id from remote site, wrong format: account id must me a string")
	}
	account, err := core.DecodePrincipal(accountID)
	if err != nil {
		return &ret, fmt.Errorf("add site: Got an invalid accountID [%s]: %w", accountID, err)
	}
	info, err := mttnet.AddrInfoFromStrings(addresses...)
	if err != nil {
		return &ret, fmt.Errorf("add site: Couldn't parse multiaddress: %w", err)
	}

	if err = api.disc.Connect(ctx, info); err != nil {
		return &ret, fmt.Errorf("add site: Couldn't connect to the remote site via p2p: %w", err)
	}

	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return &ret, fmt.Errorf("add site: Cannot connect to internal db")
	}
	defer cancel()
	if _, err = sitesql.GetSite(conn, in.Hostname); err == nil {
		return &ret, fmt.Errorf("add site: Site " + in.Hostname + " already added")
	}

	var role documents.Member_Role
	// make it a proxy call since we want to talk with the site by attaching headers
	header := metadata.New(map[string]string{mttnet.MttHeader: in.Hostname})
	ctx = metadata.NewIncomingContext(ctx, header) // Usually, the headers are written by the client in the outgoing context and server receives them in the incoming. But here we are writing the server directly
	ctx = context.WithValue(ctx, mttnet.SiteAccountIDCtxKey, accountID)
	if in.InviteToken != "" {
		res, err := api.RemoteCaller.RedeemInviteToken(ctx, &documents.RedeemInviteTokenRequest{
			Token: in.InviteToken,
		})
		if err != nil {
			return &ret, fmt.Errorf("add site: Couldn't redeem the attached token: %w", err)
		}
		role = res.Role
	} else {
		res, err := api.RemoteCaller.RedeemInviteToken(ctx, &documents.RedeemInviteTokenRequest{})
		if err != nil {
			return &ret, fmt.Errorf("add site: Please, contact to the site owner to get an invite token: %w", err)
		}
		role = res.Role
	}

	if err = sitesql.AddSite(conn, account, strings.Join(addresses, " "), in.Hostname, int64(role)); err != nil {
		return &ret, fmt.Errorf("add site: Could not insert site in the database: %w", err)
	}
	ret.Hostname = in.Hostname
	ret.Role = documents.Member_Role(role)
	return &ret, nil
}

// RemoveSite removes locally a previously added site.
func (api *Server) RemoveSite(ctx context.Context, req *documents.RemoveSiteRequest) (*emptypb.Empty, error) {
	empty := &emptypb.Empty{}
	if req.Hostname == "" {
		return empty, fmt.Errorf("empty hostname")
	}

	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return empty, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	return empty, sitesql.RemoveSite(conn, req.Hostname)
}

// ListSites lists all the added sites.
func (api *Server) ListSites(ctx context.Context, req *documents.ListSitesRequest) (*documents.ListSitesResponse, error) {
	var s []*documents.SiteConfig
	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return &documents.ListSitesResponse{}, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	sites, err := sitesql.ListSites(conn)
	if err != nil {
		return &documents.ListSitesResponse{}, fmt.Errorf("Could not list sites: %w", err)
	}
	for _, info := range sites {
		s = append(s, &documents.SiteConfig{
			Hostname: info.SitesHostname,
			Role:     documents.Member_Role(info.SitesRole),
		})
	}
	return &documents.ListSitesResponse{
		Sites: s,
	}, nil
}

// ListWebPublicationRecords returns all the sites where a given document has been published to.
func (api *Server) ListWebPublicationRecords(ctx context.Context, req *documents.ListWebPublicationRecordsRequest) (*documents.ListWebPublicationRecordsResponse, error) {
	var ret []*documents.WebPublicationRecord
	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	sites, err := sitesql.ListSites(conn)
	if err != nil {
		return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("Could not list sites: %w", err)
	}
	for _, siteInfo := range sites {
		header := metadata.New(map[string]string{mttnet.MttHeader: siteInfo.SitesHostname})
		ctx = metadata.NewIncomingContext(ctx, header) // Usually, the headers are written by the client in the outgoing context and server receives them in the incoming. But here we are writing the server directly
		ctx = context.WithValue(ctx, mttnet.SiteAccountIDCtxKey, core.Principal(siteInfo.PublicKeysPrincipal).String())
		docs, err := api.RemoteCaller.ListWebPublications(ctx, &documents.ListWebPublicationsRequest{})
		if err != nil {
			continue
		}
		for _, doc := range docs.Publications {
			if req.DocumentId == doc.DocumentId && (req.Version == "" || req.Version == doc.Version) {
				if doc.Hostname != siteInfo.SitesHostname {
					return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("found document [%s] in remote site [%s], but the site was added locally as [%s]", req.DocumentId, doc.Hostname, siteInfo.SitesHostname)
				}
				ret = append(ret, &documents.WebPublicationRecord{
					DocumentId: doc.DocumentId,
					Version:    doc.Version,
					Hostname:   doc.Hostname,
					Path:       doc.Path,
				})
			}
		}
	}
	return &documents.ListWebPublicationRecordsResponse{
		Publications: ret,
	}, nil
}
