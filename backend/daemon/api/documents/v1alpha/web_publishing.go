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
}

// AddSite checks if the provided site hostname is a valid Mintter site and if so, add it to the database.
func (api *Server) AddSite(ctx context.Context, req *documents.AddSiteRequest) (*documents.SiteConfig, error) {
	ret := documents.SiteConfig{
		Hostname: "",
		Role:     documents.Member_ROLE_UNSPECIFIED,
	}
	if req.Hostname == "" {
		return &ret, fmt.Errorf("empty hostname")
	}
	if strings.Contains(strings.ToLower(req.Hostname), "notallow") {
		return &ret, fmt.Errorf("site " + req.Hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(req.Hostname), "taken") {
		return &ret, fmt.Errorf("site " + req.Hostname + " already taken")
	}
	//TODO: substitute with proper remote calls
	_, added := api.sitesDB[req.Hostname]
	if added {
		return &ret, fmt.Errorf("site " + req.Hostname + " already added")
	}

	if strings.Contains(strings.ToLower(req.InviteToken), "unspecified") {
		api.sitesDB[req.Hostname] = siteInfo{inviteLink: req.InviteToken, role: int(documents.Member_ROLE_UNSPECIFIED)}
	} else if strings.Contains(strings.ToLower(req.InviteToken), "owner") {
		api.sitesDB[req.Hostname] = siteInfo{inviteLink: req.InviteToken, role: int(documents.Member_OWNER)}
	} else {
		api.sitesDB[req.Hostname] = siteInfo{inviteLink: req.InviteToken, role: int(documents.Member_EDITOR)}
	}
	ret.Hostname = req.Hostname
	ret.Role = documents.Member_Role(api.sitesDB[req.Hostname].role)
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
	return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("Not yet implemented")
}
