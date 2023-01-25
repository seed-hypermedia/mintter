package site

import (
	"fmt"
	v1alpha "mintter/backend/genproto/site/v1alpha"
	"strings"
)

func AddSite(hostname, link string) (v1alpha.Member_Role, error) {
	if strings.Contains(strings.ToLower(hostname), "notallow") {
		return v1alpha.Member_ROLE_UNSPECIFIED, fmt.Errorf("site " + hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(link), "unspecified") {
		return v1alpha.Member_ROLE_UNSPECIFIED, nil
	} else if strings.Contains(strings.ToLower(link), "owner") {
		return v1alpha.Member_OWNER, nil
	}
	return v1alpha.Member_EDITOR, nil
}
