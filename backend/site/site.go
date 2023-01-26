// site implements all the logic to get site information (both local and remote).
package site

import (
	"fmt"
	daemon_proto "mintter/backend/genproto/daemon/v1alpha"
	site_proto "mintter/backend/genproto/site/v1alpha"
	"strings"
)

// Service wraps everything necessary to deliver a site service.
type siteInfo struct {
	role        int
	invite_link string
}

// Service wraps everything necessary to deliver a site service.
type Service struct {
	sitesDB map[string]siteInfo
}

func New() *Service {
	return &Service{
		sitesDB: map[string]siteInfo{}, //TODO: remove when mocking is done
	}
}

// AddSite adds a site locally with the role specified in the invitation link
func (srv *Service) AddSite(hostname, link string) (site_proto.Member_Role, error) {
	if hostname == "" {
		return site_proto.Member_ROLE_UNSPECIFIED, fmt.Errorf("empty hostname")
	}
	if strings.Contains(strings.ToLower(hostname), "notallow") {
		return site_proto.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(hostname), "taken") {
		return site_proto.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " already taken")
	}
	//TODO: substitute with proper remote calls
	_, added := srv.sitesDB[hostname]
	if added {
		return site_proto.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " already added")
	}

	if strings.Contains(strings.ToLower(link), "unspecified") {
		srv.sitesDB[hostname] = siteInfo{invite_link: link, role: int(site_proto.Member_ROLE_UNSPECIFIED)}
	} else if strings.Contains(strings.ToLower(link), "owner") {
		srv.sitesDB[hostname] = siteInfo{invite_link: link, role: int(site_proto.Member_OWNER)}
	} else {
		srv.sitesDB[hostname] = siteInfo{invite_link: link, role: int(site_proto.Member_EDITOR)}
	}

	return site_proto.Member_Role(srv.sitesDB[hostname].role), nil
}

func (srv *Service) DeleteSite(hostname string) error {
	if hostname == "" {
		return fmt.Errorf("empty hostname")
	}

	_, included := srv.sitesDB[hostname]
	if !included {
		return fmt.Errorf("site " + hostname + " does not exist")
	}
	delete(srv.sitesDB, hostname)
	return nil
}

func (srv *Service) ListSites() ([]*daemon_proto.SiteConfig, error) {
	var s []*daemon_proto.SiteConfig
	for hostname, info := range srv.sitesDB {
		s = append(s, &daemon_proto.SiteConfig{
			Hostname: hostname,
			Role:     site_proto.Member_Role(info.role),
		})
	}
	return s, nil
}
