package site

import (
	"fmt"
	v1alpha "mintter/backend/genproto/site/v1alpha"
	"strings"
)

// Service wraps everything necessary to deliver a site service.
type Service struct {
	sitesDB map[string]string
}

func New() *Service {
	return &Service{
		sitesDB: map[string]string{}, //TODO: remove when mocking is done
	}
}

func (srv *Service) AddSite(hostname, link string) (v1alpha.Member_Role, error) {
	if hostname == "" {
		return v1alpha.Member_ROLE_UNSPECIFIED, fmt.Errorf("empty hostname")
	}
	if strings.Contains(strings.ToLower(hostname), "notallow") {
		return v1alpha.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(hostname), "taken") {
		return v1alpha.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " already taken")
	}
	//TODO: substitute with proper remote calls
	_, added := srv.sitesDB[hostname]
	if added {
		return v1alpha.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " already added")
	}

	srv.sitesDB[hostname] = link

	if strings.Contains(strings.ToLower(link), "unspecified") {
		return v1alpha.Member_ROLE_UNSPECIFIED, nil
	} else if strings.Contains(strings.ToLower(link), "owner") {
		return v1alpha.Member_OWNER, nil
	}
	return v1alpha.Member_EDITOR, nil
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
