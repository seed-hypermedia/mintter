package sitesql

import (
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"

	"crawshaw.io/sqlite"
)

// GetMemberRole gets a member role. Error if it does not exist.
func GetMemberRole(conn *sqlite.Conn, account core.Principal) (documents.Member_Role, error) {
	member, err := GetMember(conn, account)
	if err != nil {
		return 0, err
	}

	if member.SiteMembersRole == int64(documents.Member_ROLE_UNSPECIFIED) {
		return 0, fmt.Errorf("could not get member for account %s: %w", account.String(), err)
	}

	return documents.Member_Role(member.SiteMembersRole), nil
}

// AddMember to the site.
func AddMember(conn *sqlite.Conn, publicKeysPrincipal []byte, siteMembersRole int64) (InsertMemberResult, error) {
	if err := publicKeysInsertOrIgnore(conn, publicKeysPrincipal); err != nil {
		return InsertMemberResult{}, err
	}

	return InsertMember(conn, publicKeysPrincipal, siteMembersRole)
}
