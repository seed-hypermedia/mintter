package sitesql

import (
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper/hypersql"

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
	key, err := ensurePublicKey(conn, publicKeysPrincipal)
	if err != nil {
		return InsertMemberResult{}, err
	}

	return InsertMember(conn, key, siteMembersRole)
}

// AddWebPublicationRecord ensuring entity ID exists.
func AddWebPublicationRecord(conn *sqlite.Conn, hyperEntitiesEID string, webPublicationRecordsDocumentVersion string, webPublicationRecordsPath string) error {
	eid, err := ensureEntity(conn, hyperEntitiesEID)
	if err != nil {
		return err
	}

	return InsertWebPublicationRecord(conn, eid, webPublicationRecordsDocumentVersion, webPublicationRecordsPath)
}

func ensureEntity(conn *sqlite.Conn, entity string) (int64, error) {
	look, err := hypersql.EntitiesLookupID(conn, entity)
	if err != nil {
		return 0, err
	}
	if look.HDEntitiesID != 0 {
		return look.HDEntitiesID, nil
	}

	ins, err := hypersql.EntitiesInsertOrIgnore(conn, entity)
	if err != nil {
		return 0, err
	}
	if ins.HDEntitiesID == 0 {
		return 0, fmt.Errorf("failed to insert entity %q for some reason", entity)
	}

	return ins.HDEntitiesID, nil
}

func ensurePublicKey(conn *sqlite.Conn, key []byte) (int64, error) {
	res, err := hypersql.PublicKeysLookupID(conn, key)
	if err != nil {
		return 0, err
	}

	if res.PublicKeysID > 0 {
		return res.PublicKeysID, nil
	}

	ins, err := hypersql.PublicKeysInsert(conn, key)
	if err != nil {
		return 0, err
	}

	if ins.PublicKeysID <= 0 {
		panic("BUG: failed to insert key for some reason")
	}

	return ins.PublicKeysID, nil
}
