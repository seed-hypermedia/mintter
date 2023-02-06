// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	context "context"
	"fmt"
	documents "mintter/backend/genproto/documents/v1alpha"
	"strings"

	"google.golang.org/protobuf/types/known/emptypb"
)

type siteInfo struct {
	role       int
	inviteLink string
	address    string
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

	// TODO (juligasa): uncomment when site is ready
	/*
		requestURL := fmt.Sprintf("https://%s/.well-known", in.Hostname)

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
		var response map[string]string
		err = json.NewDecoder(res.Body).Decode(&response)
		if err != nil{
			return &ret, fmt.Errorf("Unrecognized response format %w", err)
		}
		address, ok := response["address"]
		if !ok {
			return &ret, fmt.Errorf("address not found in payload")
		}
	*/
	address := "/ip4/23.20.24.146/tcp/55001/p2p/12D3KooWAAmbS5QL7vcf9A9r5A4Q3qhs8ZH8gPwXQixrS8FWD28w"

	_, added := api.sitesDB[in.Hostname]
	if added {
		return &ret, fmt.Errorf("site " + in.Hostname + " already added")
	}

	if strings.Contains(strings.ToLower(in.InviteToken), "unspecified") {
		api.sitesDB[in.Hostname] = siteInfo{address: address, inviteLink: in.InviteToken, role: int(documents.Member_ROLE_UNSPECIFIED)}
	} else if strings.Contains(strings.ToLower(in.InviteToken), "owner") {
		api.sitesDB[in.Hostname] = siteInfo{address: address, inviteLink: in.InviteToken, role: int(documents.Member_OWNER)}
	} else {
		api.sitesDB[in.Hostname] = siteInfo{address: address, inviteLink: in.InviteToken, role: int(documents.Member_EDITOR)}
	}
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
