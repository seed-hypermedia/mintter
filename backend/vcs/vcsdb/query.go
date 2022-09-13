package vcsdb

import (
	"encoding/json"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/pkg/must"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/leporo/sqlf"
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

// QueryLastValue returns the last value for a given (entity, attribute) at a given point in time.
func (conn *Conn) QueryLastValue(object LocalID, cs ChangeSet, entity NodeID, a Attribute) (d Datom) {
	must.Maybe(&conn.err, func() error {
		q := newQuery(cs, true).
			Where(sqliteschema.DatomsEntity.String()+" = ?", entity.Bytes()).
			Where(sqliteschema.DatomAttrsAttr.String()+" = ?", a).
			Limit(1)
		defer q.Close()

		return sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
			d = DatomRow{stmt: stmt}.Datom()
			return nil
		}, q.Args()...)
	})

	return d
}

// QueryValuesByAttr returns all the possible values for a given (entity, attribute) at a given point in time.
// Entity can be zero so all attributes will be returned for all the known entities.
func (conn *Conn) QueryValuesByAttr(object LocalID, cs ChangeSet, entity NodeID, a Attribute) (out []Datom) {
	must.Maybe(&conn.err, func() error {
		q := newQuery(cs, false)

		if !entity.IsZero() {
			q.Where(sqliteschema.DatomsEntity.String()+" = ?", entity.Bytes())
		}

		q.Where(sqliteschema.DatomAttrsAttr.String()+" = ?", a)

		defer q.Close()

		return sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
			out = append(out, DatomRow{stmt: stmt}.Datom())
			return nil
		}, q.Args()...)
	})

	return out
}

func newQuery(cs ChangeSet, reverse bool) *sqlf.Stmt {
	stmt := sqlf.
		Select(sqliteschema.DatomsChange.String()).
		Select(sqliteschema.DatomsSeq.String()).
		Select(sqliteschema.DatomsEntity.String()).
		Select(sqliteschema.DatomAttrsAttr.String()).
		Select(sqliteschema.DatomsValueType.String()).
		Select(sqliteschema.DatomsValue.String()).
		Select(sqliteschema.ChangesLamportTime.String()).
		From(string(sqliteschema.Datoms)).
		Join(string(sqliteschema.DatomAttrs), sqliteschema.DatomAttrsID.String()+" = "+sqliteschema.DatomsAttr.String()).
		Join(string(sqliteschema.Changes), sqliteschema.ChangesID.String()+" = "+sqliteschema.DatomsChange.String()).
		Where(sqliteschema.DatomsChange.String()+" IN (SELECT value FROM json_each(?))", cs)

	if reverse {
		stmt.OrderBy(
			sqliteschema.ChangesLamportTime.String()+" DESC",
			sqliteschema.DatomsChange.String()+" DESC",
			sqliteschema.DatomsSeq.String()+" DESC",
		)
	} else {
		stmt.OrderBy(
			sqliteschema.ChangesLamportTime.String(),
			sqliteschema.DatomsChange.String(),
			sqliteschema.DatomsSeq.String(),
		)
	}

	return stmt
}
