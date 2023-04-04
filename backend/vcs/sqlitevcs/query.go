package sqlitevcs

import (
	"encoding/json"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/pkg/must"
	"strconv"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
)

// ChangeSet is a JSON-encoded array of LocalID,
// which represents a full list of changes for a given
// object at a given point in time.
type ChangeSet []byte

var qLoadChangeSet = qb.MakeQuery(sqliteschema.Schema, "loadChangeSet", sqlitegen.QueryKindMany,
	"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
		"SELECT value",
		"FROM json_each(:heads)",
		"UNION",
		"SELECT", qb.Results(
			sqliteschema.ChangeDepsParent,
		),
		"FROM", sqliteschema.ChangeDeps,
		"JOIN changeset ON changeset.change", "=", sqliteschema.ChangeDepsChild,
	), '\n',
	"SELECT json_group_array(change)", '\n',
	"FROM changeset", '\n',
	"LIMIT 1",
)

// ResolveChangeSet recursively walks the DAG of Changes from the given leafs (heads)
// up to the first change and returns the list of resolved changes as a JSON array.
func (conn *Conn) ResolveChangeSet(object LocalID, heads LocalVersion) (cs ChangeSet) {
	must.Maybe(&conn.err, func() error {
		heads, err := json.Marshal(heads)
		if err != nil {
			return nil
		}

		return sqlitex.Exec(conn.conn, qLoadChangeSet.SQL, func(stmt *sqlite.Stmt) error {
			cs = stmt.ColumnBytes(0)
			return nil
		}, heads)
	})
	return cs
}

// ChangeInfo contains metadata about a given Change.
type ChangeInfo struct {
	LocalID LocalID
	CID     cid.Cid
}

// IsZero indicates whether it's a zero value.
func (ci ChangeInfo) IsZero() bool {
	return ci.LocalID == 0
}

// StringID returns ChangeID as a string. Including for in-progress changes.
func (ci ChangeInfo) StringID() string {
	if ci.IsZero() {
		return ""
	}

	if ci.CID.Defined() {
		return ci.CID.String()
	}

	return "$LOCAL$:" + strconv.Itoa(int(ci.LocalID))
}
