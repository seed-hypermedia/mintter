package hypersql

import (
	"fmt"
	"mintter/backend/daemon/storage"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
)

// LookupInsert is a query to insert lookup values.
func LookupInsert(conn *sqlite.Conn, ltype int, value any) (id int64, err error) {
	const q = `INSERT INTO lookup (type, value) VALUES (?, ?) RETURNING id;`

	if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
		id = stmt.ColumnInt64(0)
		return nil
	}, ltype, value); err != nil {
		return 0, err
	}

	if id == 0 {
		return 0, fmt.Errorf("failed to insert lookup value")
	}

	return id, nil
}

// LookupGet find the ID of the lookup value.
func LookupGet(conn *sqlite.Conn, ltype int, value any) (id int64, err error) {
	const q = "SELECT id FROM lookup WHERE type = ? AND value = ?;"

	if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
		id = stmt.ColumnInt64(0)
		return nil
	}, ltype, value); err != nil {
		return 0, err
	}

	return id, nil
}

// LookupEnsure makes sure lookup value exists and returns its ID.
func LookupEnsure(conn *sqlite.Conn, ltype int, value any) (id int64, err error) {
	id, err = LookupGet(conn, ltype, value)
	if err != nil {
		return 0, fmt.Errorf("failed to get lookup value: %w", err)
	}

	if id != 0 {
		return id, nil
	}

	return LookupInsert(conn, ltype, value)
}

var qAttrInsert = `INSERT INTO ` + storage.BlobAttrs.String() + ` (
	` + storage.BlobAttrsBlob.ShortName() + `,
	` + storage.BlobAttrsKey.ShortName() + `,
	` + storage.BlobAttrsAnchor.ShortName() + `,
	` + storage.BlobAttrsIsLookup.ShortName() + `,
	` + storage.BlobAttrsValue.ShortName() + `,
	` + storage.BlobAttrsExtra.ShortName() + `,
	` + storage.BlobAttrsTs.ShortName() + `
) VALUES (?, ?, ?, ?, ?, ?, ?);`

// BlobAttrsInsert inserts blob attribute.
func BlobAttrsInsert(conn *sqlite.Conn, blob int64, key, anchor string, isLookup bool, value, extra any, ts int64) error {
	return sqlitex.Exec(conn, qAttrInsert, nil, blob, key, anchor, isLookup, value, extra, ts)
}

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
	const q = `
		SELECT
			blob_attrs.value_ptr
		FROM changes
		JOIN blob_attrs ON blob_attrs.blob = changes.blob
		WHERE changes.entity = :entity
		AND blob_attrs.key = 'resource/owner'
		AND blob_attrs.value_ptr IS NOT NULL`

	var owner int64
	if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
		if owner != 0 {
			return fmt.Errorf("more than one owner resource owner found")
		}
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

// GroupListMembers return the list of group members.
func GroupListMembers(conn *sqlite.Conn, resource, owner int64, fn func(principal []byte, role int64) error) error {
	const q = `
		SELECT
			lookup.value AS principal,
			blob_attrs.extra AS role
		FROM changes
		JOIN blob_attrs ON blob_attrs.blob = changes.blob
		JOIN lookup ON lookup.id = blob_attrs.value_ptr
		WHERE changes.entity = :entity
		AND changes.author = :owner
		AND blob_attrs.key = 'group/member'
		AND blob_attrs.value_ptr IS NOT NULL
	`

	return sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
		principal := stmt.ColumnBytes(0)
		role := stmt.ColumnInt64(1)
		return fn(principal, role)
	}, resource, owner)
}

// GroupGetRole returns the role of the member in the group.
func GroupGetRole(conn *sqlite.Conn, resource, owner, member int64) (int64, error) {
	const q = `
		SELECT
			blob_attrs.extra AS role
		FROM changes
		JOIN blob_attrs ON blob_attrs.blob = changes.blob
		JOIN lookup ON lookup.id = blob_attrs.value_ptr
		WHERE changes.entity = :entity
		AND changes.author = :owner
		AND blob_attrs.key = 'group/member'
		AND blob_attrs.value_ptr IS NOT NULL
		AND blob_attrs.value_ptr = :member
		ORDER BY blob_attrs.ts DESC
		LIMIT 1
	`

	var role int64

	if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
		role = stmt.ColumnInt64(0)
		return nil
	}, resource, owner, member); err != nil {
		return 0, err
	}

	return role, nil
}
