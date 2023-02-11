// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	context "context"
	"encoding/json"
	"fmt"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet"
	"net/http"
	"strings"

	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/emptypb"
)

type siteInfo struct {
	role       int
	inviteLink string
	addresses  []string
	accID      string
}

// AddSite checks if the provided site hostname is a valid Mintter site and if so, add it to the database.
func (api *Server) AddSite(ctx context.Context, in *documents.AddSiteRequest) (*documents.SiteConfig, error) {
	ret := documents.SiteConfig{
		Hostname: "",
		Role:     documents.Member_ROLE_UNSPECIFIED,
	}
	if in.Hostname == "" {
		return &ret, fmt.Errorf("empty hostname")
	}
	if strings.Contains(strings.ToLower(in.Hostname), "notallow") {
		return &ret, fmt.Errorf("site " + in.Hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(in.Hostname), "taken") {
		return &ret, fmt.Errorf("site " + in.Hostname + " already taken")
	}

	//addresses := []string{"/ip4/23.20.24.146/tcp/55001/p2p/12D3KooWAAmbS5QL7vcf9A9r5A4Q3qhs8ZH8gPwXQixrS8FWD28w"}
	//accountID := "bahezrj4iaqacicabciqeoo2zi3sktlvzwxiqwilwfpm2hucu2ihsa7zzqtrkmbeoef6lagy"

	//TODO(juligasa): https instead of http
	requestURL := fmt.Sprintf("http://%s/%s", in.Hostname, mttnet.WellKnownPath)

	req, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return &ret, fmt.Errorf("could not create request to well-known site: %w ", err)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return &ret, fmt.Errorf("could not contact to provided site: %w ", err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return &ret, fmt.Errorf("Wrong status code from site %d", res.StatusCode)
	}
	var response map[string]interface{}
	err = json.NewDecoder(res.Body).Decode(&response)
	if err != nil {
		return &ret, fmt.Errorf("Unrecognized response format %w", err)
	}
	addressesRes, ok := response["addresses"]
	if !ok {
		return &ret, fmt.Errorf("address not found in payload")
	}

	var addresses []string
	addressesList, ok := addressesRes.([]interface{})
	if !ok {
		return &ret, fmt.Errorf("Error getting p2p addresses from site, wrong format: addresses must be a list of multiaddresses even if only one provided")
	}
	for _, addrs := range addressesList {
		addr, ok := addrs.(string)
		if !ok {
			return &ret, fmt.Errorf("Error getting p2p addresses from site, wrong format: individual multiaddresses must be a string")
		}
		addresses = append(addresses, addr)
	}

	accountRes, ok := response["account_id"]
	if !ok {
		return &ret, fmt.Errorf("account_id not found in payload")
	}

	accountID, ok := accountRes.(string)
	if !ok {
		return &ret, fmt.Errorf("Error getting account_id from site, wrong format: account id must me a string")
	}

	info, err := mttnet.AddrInfoFromStrings(addresses...)
	if err != nil {
		return &ret, fmt.Errorf("Couldn't parse multiaddress: %w", err)
	}

	if err = api.disc.Connect(ctx, info); err != nil {
		return &ret, fmt.Errorf("Couldn't connect to the remote site via p2p: %w", err)
	}

	_, added := api.sitesDB[in.Hostname]
	if added {
		return &ret, fmt.Errorf("site " + in.Hostname + " already added")
	}
	var role documents.Member_Role
	// make it a proxy call since we want to talk with the site by attaching headers
	header := metadata.New(map[string]string{mttnet.MttHeader: in.Hostname})
	ctx = metadata.NewOutgoingContext(ctx, header)
	ctx = context.WithValue(ctx, mttnet.SiteAccountIDCtxKey, accountID)
	if in.InviteToken != "" {
		res, err := api.TokenRedeemer.RedeemInviteToken(ctx, &documents.RedeemInviteTokenRequest{
			Token: in.InviteToken,
		})
		if err != nil {
			return &ret, fmt.Errorf("Couldn't redeem the attached token: %w", err)
		}
		role = res.Role
	} else {
		res, err := api.TokenRedeemer.RedeemInviteToken(ctx, &documents.RedeemInviteTokenRequest{})
		if err != nil {
			return &ret, fmt.Errorf("Please, contact to the site owner to get an invite token: %w", err)
		}
		role = res.Role
	}

	api.sitesDB[in.Hostname] = siteInfo{addresses: addresses, inviteLink: in.InviteToken, role: int(role), accID: accountID}
	ret.Hostname = in.Hostname
	ret.Role = documents.Member_Role(api.sitesDB[in.Hostname].role)
	return &ret, nil
}

// RemoveSite removes locally a previously added site.
func (api *Server) RemoveSite(ctx context.Context, req *documents.RemoveSiteRequest) (*emptypb.Empty, error) {
	empty := &emptypb.Empty{}
	if req.Hostname == "" {
		return empty, fmt.Errorf("empty hostname")
	}

	_, included := api.sitesDB[req.Hostname]
	if !included {
		return empty, fmt.Errorf("site " + req.Hostname + " does not exist")
	}
	delete(api.sitesDB, req.Hostname)
	return empty, nil
}

// ListSites lists all the added sites.
func (api *Server) ListSites(ctx context.Context, req *documents.ListSitesRequest) (*documents.ListSitesResponse, error) {
	var s []*documents.SiteConfig
	for hostname, info := range api.sitesDB {
		s = append(s, &documents.SiteConfig{
			Hostname: hostname,
			Role:     documents.Member_Role(info.role),
		})
	}
	return &documents.ListSitesResponse{
		Sites: s,
	}, nil
}

// ListWebPublicationRecords returns all the sites a given a document has been published to.
func (api *Server) ListWebPublicationRecords(ctx context.Context, req *documents.ListWebPublicationRecordsRequest) (*documents.ListWebPublicationRecordsResponse, error) {
	var ret []*documents.WebPublicationRecord
	// TODO(juligasa): replace with a proper remote call to all known sites in the api.sitesDB
	for _, v := range *api.localWebPublicationRecordDB {
		if req.DocumentId == v.Document.ID && (req.Version == "" || req.Version == v.Document.Version) {
			ret = append(ret, &documents.WebPublicationRecord{
				DocumentId: v.Document.ID,
				Version:    v.Document.Version,
				Hostname:   v.Hostname,
				Path:       v.Path,
			})
		}
	}
	return &documents.ListWebPublicationRecordsResponse{
		Publications: ret,
	}, nil
}

// GetSiteAccount returns a site's accountID so other gRPC can use it.
// TODO(juligasa): remove when database schema is ready since SiteInfo will be available there.
func (api *Server) GetSiteAccount(hostname string) (string, error) {
	siteInfo, ok := api.sitesDB[hostname]

	if !ok {
		return "", fmt.Errorf("site %s not found. Please add it first", hostname)
	}
	return siteInfo.accID, nil
}
