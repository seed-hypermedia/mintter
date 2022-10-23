package sqlitevcs

import (
	"encoding/json"
	"fmt"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/leporo/sqlf"
	"go.uber.org/multierr"
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
			Where(sqliteschema.DatomsEntity.String()+" = ?", entity).
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

// QueryObjectDatoms loads all the datoms for an object at a given version.
func (conn *Conn) QueryObjectDatoms(obj LocalID, cs ChangeSet) (it *DatomIterator) {
	must.Maybe(&conn.err, func() error {
		q := newQuery(cs, false)
		defer q.Close()

		it = queryDatoms(conn.conn, q.String(), q.Args()...)

		return nil
	})
	return it
}

// QueryValuesByAttr returns all the possible values for a given (entity, attribute) at a given point in time.
// Entity can be zero so all attributes will be returned for all the known entities.
func (conn *Conn) QueryValuesByAttr(object LocalID, cs ChangeSet, entity NodeID, a Attribute) (it *DatomIterator) {
	must.Maybe(&conn.err, func() error {
		q := newQuery(cs, false)
		defer q.Close()

		if !entity.IsZero() {
			q.Where(sqliteschema.DatomsEntity.String()+" = ?", entity)
		}

		q.Where(sqliteschema.DatomAttrsAttr.String()+" = ?", a)

		it = queryDatoms(conn.conn, q.String(), q.Args()...)

		return nil
	})

	return it
}

func baseDatomQuery(reverse bool) *sqlf.Stmt {
	stmt := sqlf.From(string(sqliteschema.Datoms))
	for _, col := range datomCols {
		stmt.Select(col.String())
	}
	stmt.Join(string(sqliteschema.DatomAttrs), sqliteschema.DatomAttrsID.String()+" = "+sqliteschema.DatomsAttr.String())
	stmt.Join(string(sqliteschema.Changes), sqliteschema.ChangesID.String()+" = "+sqliteschema.DatomsChange.String())

	if reverse {
		stmt.OrderBy(
			sqliteschema.DatomsTime.String()+" DESC",
			sqliteschema.DatomsOrigin.String()+" DESC",
		)
	} else {
		stmt.OrderBy(
			sqliteschema.DatomsTime.String(),
			sqliteschema.DatomsOrigin.String(),
		)
	}

	return stmt
}

func newQuery(cs ChangeSet, reverse bool) *sqlf.Stmt {
	stmt := baseDatomQuery(reverse)
	stmt.Where(sqliteschema.DatomsChange.String()+" IN (SELECT value FROM json_each(?))", cs)

	return stmt
}

// DatomIterator is an iterator for a query result that returns datoms.
type DatomIterator struct {
	stmt *sqlite.Stmt
	err  error
}

// Item returns the current datom.
func (c *DatomIterator) Item() DatomRow {
	return DatomRow{stmt: c.stmt}
}

// Err is used to check if there were any errors during iterations.
// Users should call this after they are done with the iterator.
func (c *DatomIterator) Err() error {
	if c == nil {
		return fmt.Errorf("query datoms: nil iterator")
	}

	return c.err
}

// Next advances the iterator.
func (c *DatomIterator) Next() bool {
	if c == nil {
		return false
	}

	if c.err != nil {
		return false
	}

	row, err := c.stmt.Step()
	if err != nil {
		c.err = fmt.Errorf("Cursor.Next: %w", err)
		return false
	}
	if !row {
		c.err = c.stmt.Reset()
	}
	return row
}

// Slice returns the remaining results accumulated in a slice.
func (c *DatomIterator) Slice() (out []Datom) {
	for c.Next() {
		out = append(out, c.Item().Datom())
	}
	return out
}

// Close can be used to prematurely close the iterator.
// No need to call this after Next() returns false.
func (c *DatomIterator) Close() error {
	return multierr.Combine(c.stmt.Reset(), c.err)
}

func queryDatoms(conn *sqlite.Conn, q string, args ...any) *DatomIterator {
	stmt := conn.Prep(q)
	sqlitex.BindArgs(stmt, args...)
	return &DatomIterator{stmt: stmt}
}

var (
	datomCols = []sqlitegen.Column{
		sqliteschema.DatomsPermanode,
		sqliteschema.DatomsEntity,
		sqliteschema.DatomAttrsAttr,
		sqliteschema.DatomsValueType,
		sqliteschema.DatomsValue,
		sqliteschema.DatomsChange,
		sqliteschema.DatomsTime,
		sqliteschema.DatomsOrigin,
	}

	datomColIdx = map[sqlitegen.Column]int{}
)

func init() {
	for i, col := range datomCols {
		datomColIdx[col] = i
	}
}

// DatomRow is an accessor for Datom data using a database row.
type DatomRow struct {
	stmt *sqlite.Stmt
}

// Datom collects the Datom from the database row.
func (dr DatomRow) Datom() Datom {
	vt, v := dr.Value()

	return Datom{
		Entity:    dr.Entity(),
		Attr:      dr.Attr(),
		ValueType: vt,
		Value:     v,
		Time:      dr.Time(),
		Origin:    dr.Origin(),
	}
}

// Entity returns entity column value.
func (dr DatomRow) Entity() NodeID {
	return vcs.NodeID(dr.stmt.ColumnInt64(datomColIdx[sqliteschema.DatomsEntity]))
}

// Attr returns attr column value.
func (dr DatomRow) Attr() Attribute {
	return Attribute(dr.stmt.ColumnText(datomColIdx[sqliteschema.DatomAttrsAttr]))
}

// ValueType returns value type column value.
func (dr DatomRow) ValueType() vcs.ValueType {
	return vcs.ValueType(dr.stmt.ColumnInt(datomColIdx[sqliteschema.DatomsValueType]))
}

// ValueAny returns value without its type.
func (dr DatomRow) ValueAny() any {
	_, v := dr.Value()
	return v
}

// Value returns value column value.
func (dr DatomRow) Value() (vcs.ValueType, any) {
	colValue := datomColIdx[sqliteschema.DatomsValue]

	vt := dr.ValueType()

	switch vt {
	case vcs.ValueTypeRef:
		return vt, NodeID(dr.stmt.ColumnInt64(colValue))
	case vcs.ValueTypeString:
		v := dr.stmt.ColumnText(colValue)
		return vt, v
	case vcs.ValueTypeInt:
		return vt, dr.stmt.ColumnInt(colValue)
	case vcs.ValueTypeBool:
		v := dr.stmt.ColumnInt(colValue)
		switch v {
		case 0:
			return vt, false
		case 1:
			return vt, true
		default:
			panic("BUG: invalid bool value type value")
		}
	case vcs.ValueTypeBytes:
		return vt, dr.stmt.ColumnBytes(colValue)
	case vcs.ValueTypeCID:
		c, err := cid.Cast(dr.stmt.ColumnBytes(colValue))
		if err != nil {
			panic("BUG: bad CID " + err.Error())
		}
		return vt, c
	default:
		panic("BUG: invalid value type")
	}
}

// Change returns change column value.
func (dr DatomRow) Change() LocalID {
	return LocalID(dr.stmt.ColumnInt(datomColIdx[sqliteschema.DatomsChange]))
}

// Time returns time column value.
func (dr DatomRow) Time() int64 {
	return dr.stmt.ColumnInt64(datomColIdx[sqliteschema.DatomsTime])
}

// Origin returns origin column value.
func (dr DatomRow) Origin() uint64 {
	return uint64(dr.stmt.ColumnInt64(datomColIdx[sqliteschema.DatomsOrigin]))
}
