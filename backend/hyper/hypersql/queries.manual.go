package hypersql

import (
	"fmt"
	"seed/backend/pkg/dqb"
	"seed/backend/pkg/maybe"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
)

// IsResourceOwner checks if the account is the owner of the resource.
func IsResourceOwner(conn *sqlite.Conn, resource, account int64) (bool, error) {
	owner, err := ResourceGetOwner(conn, resource)
	if err != nil {
		return false, err
	}

	return account == owner, nil
}

// ResourceGetOwner returns the owner of the resource.
func ResourceGetOwner(conn *sqlite.Conn, resource int64) (int64, error) {
	var owner int64
	if err := sqlitex.Exec(conn, qResourceGetOwner(), func(stmt *sqlite.Stmt) error {
		owner = stmt.ColumnInt64(0)
		return nil
	}, resource); err != nil {
		return 0, err
	}

	if owner == 0 {
		return 0, fmt.Errorf("resource not found or has no owner")
	}

	return owner, nil
}

var qResourceGetOwner = dqb.Str(`
	SELECT owner FROM resources WHERE id = ?;
`)

// GetGroupRole returns the role of the member in the group.
func GetGroupRole(conn *sqlite.Conn, group, memberEID string) (int64, error) {
	groupDB, err := EntitiesLookupID(conn, group)
	if err != nil {
		return 0, err
	}
	if groupDB.ResourcesID == 0 {
		return 0, fmt.Errorf("group %s not found", group)
	}

	memberDB, err := EntitiesLookupID(conn, memberEID)
	if err != nil {
		return 0, err
	}
	if memberDB.ResourcesID == 0 {
		return 0, fmt.Errorf("group member %s not found", memberEID)
	}

	var (
		role  int64
		found bool
	)
	if err := sqlitex.Exec(conn, qGetGroupRole(), func(stmt *sqlite.Stmt) error {
		role = stmt.ColumnInt64(0)
		found = true
		return nil
	}, memberDB.ResourcesID, groupDB.ResourcesID); err != nil {
		return 0, err
	}

	if !found {
		return 0, fmt.Errorf("group %s has no member %s", group, memberEID)
	}

	if role == 0 {
		return 0, fmt.Errorf("group %s has invalid role for member %s", group, memberEID)
	}

	return role, nil
}

var qGetGroupRole = dqb.Str(`
	SELECT
		resource_links.meta->>'r',
		MAX(structural_blobs.ts)
	FROM structural_blobs
	JOIN resource_links ON resource_links.source = structural_blobs.id
		AND resource_links.type = 'group/member'
		AND resource_links.target = :member
	WHERE structural_blobs.resource = :group
	GROUP BY structural_blobs.resource;
`)

// SitesInsertOrIgnore inserts a site if it doesn't exist.
func SitesInsertOrIgnore(conn *sqlite.Conn, group, baseURL string, hlc int64, origin string) error {
	return sqlitex.Exec(conn, qSitesInsertOrIgnore(), nil, group, baseURL, hlc, origin)
}

var qSitesInsertOrIgnore = dqb.Str(`
	INSERT INTO group_sites (group_id, url, hlc_time, hlc_origin) VALUES (?, ?, ?, ?)
	ON CONFLICT DO UPDATE SET
		group_id = excluded.group_id,
		url = excluded.url,
		hlc_time = excluded.hlc_time,
		hlc_origin = excluded.hlc_origin
	WHERE (hlc_time, hlc_origin) < (excluded.hlc_time, excluded.hlc_origin);
`)

// CheckEntityHasChanges checks if the entity has any changes in our database.
func CheckEntityHasChanges(conn *sqlite.Conn, entity int64) (bool, error) {
	var hasChanges bool
	if err := sqlitex.Exec(conn, qCheckEntityHasChanges(), func(stmt *sqlite.Stmt) error {
		hasChanges = true
		return nil
	}, entity); err != nil {
		return false, err
	}

	return hasChanges, nil
}

var qCheckEntityHasChanges = dqb.Str(`
	SELECT 1 FROM structural_blobs WHERE resource = ? AND structural_blobs.type = 'Change' LIMIT 1;
`)

// StructuralBlobsInsert inserts a structural blob.
func StructuralBlobsInsert(conn *sqlite.Conn, id int64, blobType string, author, resource, ts maybe.Value[int64], meta maybe.Value[string]) error {
	if id == 0 {
		return fmt.Errorf("must specify blob ID")
	}

	return sqlitex.Exec(conn, qStructuralBlobsInsert(), nil, id, blobType, author.Any(), resource.Any(), ts.Any(), meta.Any())
}

var qStructuralBlobsInsert = dqb.Str(`
	INSERT INTO structural_blobs (id, type, author, resource, ts, meta)
	VALUES (?, ?, ?, ?, ?, ?);
`)

// ResourcesMaybeSetOwner sets the owner of a resource if it's not set.
func ResourcesMaybeSetOwner(conn *sqlite.Conn, id, owner int64) (updated bool, err error) {
	if id == 0 {
		return false, fmt.Errorf("must specify resource ID")
	}

	if owner == 0 {
		return false, fmt.Errorf("must specify owner ID")
	}

	if err := sqlitex.Exec(conn, qResourcesMaybeSetOwner(), nil, owner, id); err != nil {
		return false, err
	}

	return conn.Changes() > 0, nil
}

var qResourcesMaybeSetOwner = dqb.Str(`
	UPDATE resources
	SET owner = ?
	WHERE id = ?
	AND owner IS NULL;
`)

// ResourcesMaybeSetTimestamp sets the timestamp of a resource if it's not set.
func ResourcesMaybeSetTimestamp(conn *sqlite.Conn, id, ts int64) (updated bool, err error) {
	if id == 0 {
		return false, fmt.Errorf("must specify resource ID")
	}

	if ts == 0 {
		return false, fmt.Errorf("must specify timestamp")
	}

	if err := sqlitex.Exec(conn, qResourcesMaybeSetTimestamp(), nil, ts, id); err != nil {
		return false, err
	}

	return conn.Changes() > 0, nil
}

var qResourcesMaybeSetTimestamp = dqb.Str(`
	UPDATE resources
	SET create_time = ?
	WHERE id = ?
	AND create_time IS NULL;
`)

// ResourcesUpdateMetadata updates metadata of a resource, unless it's already there.
func ResourcesUpdateMetadata(conn *sqlite.Conn, id, owner, createTime int64) (updated bool, err error) {
	if id == 0 {
		return false, fmt.Errorf("must specify resource IRI")
	}

	if err := sqlitex.Exec(conn, qResourcesUpdateMetadata(), nil, maybe.Any(owner), maybe.Any(createTime), id); err != nil {
		return false, err
	}

	return conn.Changes() > 0, nil
}

var qResourcesUpdateMetadata = dqb.Str(`
	UPDATE resources
	SET owner = ?,
		create_time = ?
	WHERE id = ?
	AND (owner IS NULL OR create_time IS NULL);
`)

// KeyDelegationsInsertOrIgnore inserts a key delegation.
func KeyDelegationsInsertOrIgnore(conn *sqlite.Conn, id, issuer, delegate int64) error {
	if id == 0 {
		return fmt.Errorf("must have ID")
	}

	if issuer == 0 {
		return fmt.Errorf("must have issuer ID")
	}

	if delegate == 0 {
		return fmt.Errorf("must have delegate ID")
	}

	return sqlitex.Exec(conn, qKeyDelegationsInsert(), nil, id, issuer, delegate)
}

var qKeyDelegationsInsert = dqb.Str(`INSERT OR IGNORE INTO key_delegations (id, issuer, delegate) VALUES (?, ?, ?);`)

// ResourceLinksInsert inserts a resource link.
func ResourceLinksInsert(conn *sqlite.Conn, sourceBlob, targetResource int64, ltype string, isPinned bool, meta []byte) error {
	return sqlitex.Exec(conn, qResourceLinksInsert(), nil, sourceBlob, targetResource, ltype, isPinned, maybe.AnySlice(meta))
}

var qResourceLinksInsert = dqb.Str(`
	INSERT INTO resource_links (source, target, type, is_pinned, meta)
	VALUES (?, ?, ?, ?, ?);
`)

// GroupListMembers lists all the members of a group.
func GroupListMembers(conn *sqlite.Conn, resource, owner int64, fn func(principal []byte, role int64) error) error {
	return sqlitex.Exec(conn, qGroupListMembers(), func(stmt *sqlite.Stmt) error {
		principal := stmt.ColumnBytes(0)
		role := stmt.ColumnInt64(1)
		return fn(principal, role)
	}, resource, owner)
}

var qGroupListMembers = dqb.Str(`
	SELECT
		public_keys.principal AS principal,
		resource_links.meta->>'r' AS role
	FROM structural_blobs
	JOIN resource_links ON resource_links.source = structural_blobs.id
	JOIN resources ON resources.id = resource_links.target
	JOIN public_keys ON public_keys.id = resources.owner
	WHERE structural_blobs.resource = :group
	AND structural_blobs.author = :owner
	AND resource_links.type = 'group/member';
`)
