package sqlitevcs

import (
	"encoding/json"
	"fmt"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"strings"
	"text/template"

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

var qIterateObjectDatoms = qb.MakeQuery(sqliteschema.Schema, "iterateObjectDatoms", sqlitegen.QueryKindMany,
	"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
		"SELECT value",
		"FROM json_each(:heads)",
		"UNION",
		"SELECT", qb.Results(
			sqliteschema.ChangeDepsParent,
		),
		"FROM", sqliteschema.ChangeDeps,
		"JOIN changeset ON changeset.change", "=", sqliteschema.ChangeDepsChild,
	),
	"SELECT", qb.Results(
		qb.ResultCol(sqliteschema.DatomsChange),
		qb.ResultCol(sqliteschema.DatomsSeq),
		qb.ResultCol(sqliteschema.DatomsEntity),
		qb.ResultCol(sqliteschema.DatomAttrsAttr),
		qb.ResultCol(sqliteschema.DatomsValueType),
		qb.ResultCol(sqliteschema.DatomsValue),
		qb.ResultCol(sqliteschema.ChangesLamportTime),
	), '\n',
	"FROM", sqliteschema.Datoms, '\n',
	"JOIN changeset ON changeset.change", "=", sqliteschema.DatomsChange, '\n',
	"JOIN", sqliteschema.DatomAttrs, "ON", sqliteschema.DatomAttrsID, "=", sqliteschema.DatomsAttr, '\n',
	"JOIN", sqliteschema.Changes, "ON", sqliteschema.ChangesID, "=", sqliteschema.DatomsChange, '\n',
	"ORDER BY", qb.Enumeration(
		sqliteschema.ChangesLamportTime,
		sqliteschema.DatomsChange,
		sqliteschema.DatomsSeq,
	),
)

// QueryObjectDatoms loads all the datoms for an object at a given version.
func (conn *Conn) QueryObjectDatoms(obj LocalID, at LocalVersion) (it *DatomIterator) {
	must.Maybe(&conn.err, func() error {
		if len(at) == 0 {
			panic("BUG: need to pass non-empty version to iterate datoms")
		}

		heads, err := json.Marshal(at)
		if err != nil {
			return err
		}

		it = queryDatoms(conn.conn, qIterateObjectDatoms.SQL, heads)

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

const (
	colChange      = 0
	colSeq         = 1
	colEntity      = 2
	colAttr        = 3
	colValueType   = 4
	colValue       = 5
	colLamportTime = 6
)

// DatomRow is an accessor for Datom data using a database row.
type DatomRow struct {
	stmt *sqlite.Stmt
}

// Datom collects the Datom from the database row.
func (dr DatomRow) Datom() Datom {
	vt, v := dr.Value()

	return Datom{
		OpID: OpID{
			Change:      dr.Change(),
			Seq:         dr.Seq(),
			LamportTime: dr.LamportTime(),
		},
		Entity:    dr.Entity(),
		Attr:      dr.Attr(),
		ValueType: vt,
		Value:     v,
	}
}

// Change returns change column value.
func (dr DatomRow) Change() LocalID {
	return LocalID(dr.stmt.ColumnInt(colChange))
}

// Seq returns seq column value.
func (dr DatomRow) Seq() int {
	return dr.stmt.ColumnInt(colSeq)
}

// Entity returns entity column value.
func (dr DatomRow) Entity() NodeID {
	return vcs.NodeID(dr.stmt.ColumnInt64(colEntity))
}

// Attr returns attr column value.
func (dr DatomRow) Attr() Attribute {
	return Attribute(dr.stmt.ColumnText(colAttr))
}

// ValueType returns value type column value.
func (dr DatomRow) ValueType() ValueType {
	return ValueType(dr.stmt.ColumnInt(colValueType))
}

// ValueAny returns value without its type.
func (dr DatomRow) ValueAny() any {
	_, v := dr.Value()
	return v
}

// Value returns value column value.
func (dr DatomRow) Value() (ValueType, any) {
	vt := dr.ValueType()

	switch vt {
	case ValueTypeRef:
		return vt, NodeID(dr.stmt.ColumnInt64(colValue))
	case ValueTypeString:
		v := dr.stmt.ColumnText(colValue)
		return vt, v
	case ValueTypeInt:
		return vt, dr.stmt.ColumnInt(colValue)
	case ValueTypeBool:
		v := dr.stmt.ColumnInt(colValue)
		switch v {
		case 0:
			return vt, false
		case 1:
			return vt, true
		default:
			panic("BUG: invalid bool value type value")
		}
	case ValueTypeBytes:
		return vt, dr.stmt.ColumnBytes(colValue)
	case ValueTypeCID:
		c, err := cid.Cast(dr.stmt.ColumnBytes(colValue))
		if err != nil {
			panic("BUG: bad CID " + err.Error())
		}
		return vt, c
	default:
		panic("BUG: invalid value type")
	}
}

// LamportTime returns lamport timestamp of the datom's change.
func (dr DatomRow) LamportTime() int {
	return dr.stmt.ColumnInt(colLamportTime)
}

// This is a query template which gets replaces by the actual string inside an init function bellow.
var forEachDatomRecursiveQuery = `WITH RECURSIVE 
x (
	{{.ChangeCol}},
	{{.SeqCol}},
	{{.EntityCol}},
	{{.AttrCol}},
	{{.ValueTypeCol}},
	{{.ValueCol}}
) AS (
	SELECT
		{{.ChangeCol}},
		{{.SeqCol}},
		{{.EntityCol}},
		{{.AttrCol}},
		{{.ValueTypeCol}},
		{{.ValueCol}}
	FROM {{.DatomsTable}}
	WHERE {{.ObjCol}} = :obj
	AND {{.EntityCol}} = :entity

	UNION

	SELECT
		{{.DatomsTable}}.{{.ChangeCol}},
		{{.DatomsTable}}.{{.SeqCol}},
		{{.DatomsTable}}.{{.EntityCol}},
		{{.DatomsTable}}.{{.AttrCol}},
		{{.DatomsTable}}.{{.ValueTypeCol}},
		{{.DatomsTable}}.{{.ValueCol}}
	FROM {{.DatomsTable}}, x
	WHERE {{.DatomsTable}}.{{.ObjCol}} = :obj
	AND x.{{.ValueTypeCol}} = 0
	AND x.{{.ValueCol}} = {{.DatomsTable}}.{{.EntityCol}}
)
SELECT
	x.{{.ChangeCol}},
	x.{{.SeqCol}},
	x.{{.EntityCol}},
	{{.AttrsTable}}.{{.AttrsAttrCol}},
	x.{{.ValueTypeCol}},
	x.{{.ValueCol}}
FROM x
JOIN {{.AttrsTable}} ON {{.AttrsTable}}.{{.AttrsIDCol}} = x.{{.AttrCol}}
`

func init() {
	tpl, err := template.New("").Parse(forEachDatomRecursiveQuery)
	if err != nil {
		panic(err)
	}

	var buf strings.Builder
	if err := tpl.Execute(&buf, datomTemplate); err != nil {
		panic(err)
	}

	forEachDatomRecursiveQuery = buf.String()
}

var datomTemplate = struct {
	AttrsTable   string
	AttrsIDCol   string
	AttrsAttrCol string

	DatomsTable  string
	ObjCol       string
	ChangeCol    string
	SeqCol       string
	EntityCol    string
	AttrCol      string
	ValueTypeCol string
	ValueCol     string
}{
	AttrsTable:   string(sqliteschema.DatomAttrs),
	AttrsIDCol:   sqliteschema.DatomAttrsID.ShortName(),
	AttrsAttrCol: sqliteschema.DatomAttrsAttr.ShortName(),

	DatomsTable:  string(sqliteschema.Datoms),
	ObjCol:       sqliteschema.DatomsPermanode.ShortName(),
	ChangeCol:    sqliteschema.DatomsChange.ShortName(),
	SeqCol:       sqliteschema.DatomsSeq.ShortName(),
	EntityCol:    sqliteschema.DatomsEntity.ShortName(),
	AttrCol:      sqliteschema.DatomsAttr.ShortName(),
	ValueTypeCol: sqliteschema.DatomsValueType.ShortName(),
	ValueCol:     sqliteschema.DatomsValue.ShortName(),
}

// ForEachDatomRecursive recursively iterates over all datoms starting from a given entity.
func (conn *Conn) ForEachDatomRecursive(obj LocalID, entity NodeID, fn func(DatomRow) error) {
	if conn.err != nil {
		return
	}

	if err := sqlitex.Exec(conn.conn, forEachDatomRecursiveQuery, handleDatoms(fn), obj, entity); err != nil {
		conn.err = err
		return
	}
}
