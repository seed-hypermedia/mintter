// Package qb is a query builder for SQLite that supports annotations
// useful for the sqlitegen package. This package requires users to annotate their queries
// using some DSL-like wrappers, which allows understanding the inputs and outputs of a query
// without having to parse SQL and understand all the different intricacies that it involves.
package qb

import (
	"fmt"
	"seed/backend/pkg/sqlitegen"
	"strconv"
	"strings"
)

// MakeQuery creates a query template that later can be used for generating the code that uses the query.
// The function will be generated using name, and parameters of the query can be of the following types:
//
// string: Useful for raw SQL fragments.
// rune: Can be used to add '\n' new lines so that generated SQL statement is more readable.
// sqlitegen.Column: Provides a type-safe way to refer to column names.
// sqlitegen.Table: Provides a type-safe way to refer to table names.
// Opt: Various option functions provided by this package. See docs for each.
//
// See qb_test.go for examples of MakeQuery.
func MakeQuery(s sqlitegen.Schema, name string, kind sqlitegen.QueryKind, vv ...interface{}) sqlitegen.QueryTemplate {
	qb := newBuilder(s, name, kind)

	qb.writeSegments(vv...)

	return qb.Build()
}

func newBuilder(s sqlitegen.Schema, name string, kind sqlitegen.QueryKind) *queryBuilder {
	return &queryBuilder{
		schema:      s,
		prevNewLine: true,
		qt: sqlitegen.QueryTemplate{
			Name: name,
			Kind: kind,
		},
	}
}

func (qb *queryBuilder) writeSegments(vv ...interface{}) {
	for _, v := range vv {
		qb.writeSegment(v)
	}
}

func (qb *queryBuilder) writeSegment(v interface{}) {
	// This is a bit cumbersome, but I haven't found a better way. The idea is that we want to
	// add spaces between different segments, except before and after a line break. This allows us to add
	// line breaks that would generate a more pretty SQL statements in the generated code.
	// newSegment creates a function that is used to write into the query builder. It's done lazily, because
	// we need to determine first whether we need to add a space that separates segments. We add space BEFORE
	// we write the segment, which is a bit counter-intuitive. We also need to cache whether the previous segment
	// was a line break, so that we avoid writing the space on a new line. It would probably be easier to understand
	// if we could just step-back one space before writing the next one, but implementing it is actually a bit more complicated.

	fn, isNewLine := newSegment(qb.schema, v)

	needSpace := !qb.prevNewLine && !isNewLine

	if needSpace {
		qb.WriteRune(' ')
	}

	fn(qb)

	qb.prevNewLine = isNewLine
}

func newSegment(s sqlitegen.Schema, v interface{}) (writeFunc func(*queryBuilder), isNewLine bool) {
	switch opt := v.(type) {
	case string:
		writeFunc = func(qb *queryBuilder) { qb.WriteString(opt) }
		if opt == "\n" {
			isNewLine = true
		}
	case int:
		writeFunc = func(qb *queryBuilder) { qb.WriteString(strconv.Itoa(opt)) }
	case rune:
		writeFunc = func(qb *queryBuilder) { qb.WriteRune(opt) }
		if opt == '\n' {
			isNewLine = true
		}
	case Opt:
		writeFunc = func(qb *queryBuilder) { opt(qb) }
	case sqlitegen.Column:
		writeFunc = func(qb *queryBuilder) { qb.WriteString(string(opt)) }
	case sqlitegen.Table:
		writeFunc = func(qb *queryBuilder) { qb.WriteString(string(opt)) }
	default:
		panic(fmt.Sprintf("unexpected type: %T", v))
	}

	return writeFunc, isNewLine
}

// Line is a line break character.
const Line = '\n'

type queryBuilder struct {
	prevNewLine bool
	schema      sqlitegen.Schema
	b           strings.Builder
	qt          sqlitegen.QueryTemplate
}

func (qb *queryBuilder) AddInput(s sqlitegen.GoSymbol) {
	qb.qt.Inputs = append(qb.qt.Inputs, s)
}

func (qb *queryBuilder) AddOutput(s sqlitegen.GoSymbol) {
	qb.qt.Outputs = append(qb.qt.Outputs, s)
}

func (qb *queryBuilder) WriteString(s string) {
	if _, err := qb.b.WriteString(s); err != nil {
		panic(err)
	}
}

func (qb *queryBuilder) WriteRune(r rune) {
	if _, err := qb.b.WriteRune(r); err != nil {
		panic(err)
	}
}

func (qb *queryBuilder) Build() sqlitegen.QueryTemplate {
	qb.qt.SQL = qb.b.String()
	return qb.qt
}

// Opt is a functional option type that modifies query template.
type Opt func(*queryBuilder)

// List accepts the same arguments as MakeQuery, but wraps them as a SQL list.
func List(vv ...interface{}) Opt {
	return func(qb *queryBuilder) {
		qb.WriteRune('(')
		for i, v := range vv {
			fn, _ := newSegment(qb.schema, v)
			fn(qb)
			if i < len(vv)-1 {
				qb.WriteString(", ")
			}
		}
		qb.WriteRune(')')
	}
}

// Concat writes out multiple concatenating them.
func Concat(vv ...interface{}) Opt {
	return func(qb *queryBuilder) {
		for _, v := range vv {
			seg, isNewLine := newSegment(qb.schema, v)
			if isNewLine {
				panic("BUG: new lines within Concat are not allowed")
			}
			seg(qb)
		}
	}
}

// Enumeration is like List but without parens.
func Enumeration(vv ...interface{}) Opt {
	return func(qb *queryBuilder) {
		for i, v := range vv {
			fn, _ := newSegment(qb.schema, v)
			fn(qb)
			if i < len(vv)-1 {
				qb.WriteString(", ")
			}
		}
	}
}

// ListColShort is a SQL list of column names without their table identifiers.
func ListColShort(cols ...sqlitegen.Column) Opt {
	short := make([]interface{}, len(cols))

	for i, c := range cols {
		short[i] = c.ShortName()
	}

	return List(short...)
}

// SubQuery creates a subquery. It accepts the same arguments as MakeQuery and List.
func SubQuery(vv ...interface{}) Opt {
	return func(qb *queryBuilder) {
		qb.WriteRune('(')
		for i, v := range vv {
			fn, isNewLine := newSegment(qb.schema, v)
			if isNewLine {
				// This is a bit stupid, will need to fix it at some point.
				// Otherwise the statement ends up looking ugly with unnecessary white spaces.
				panic("new line is not accepted in subqueries")
			}

			fn(qb)

			if i < len(vv)-1 {
				qb.WriteRune(' ')
			}
		}
		qb.WriteRune(')')
	}
}

// Insert generates a complete insert statement.
func Insert(cols ...sqlitegen.Column) Opt {
	if len(cols) == 0 {
		panic("INSERT statement must have columns to insert")
	}
	return func(qb *queryBuilder) {
		var table sqlitegen.Table

		varCols := make([]interface{}, len(cols))
		for i, c := range cols {
			if i == 0 {
				table = qb.schema.GetColumnTable(c)
			} else {
				if table != qb.schema.GetColumnTable(c) {
					panic("BUG: inserting columns from unrelated tables")
				}
			}
			varCols[i] = VarCol(c)
		}

		qb.writeSegments(
			"INSERT INTO", table, ListColShort(cols...), Line,
			"VALUES", List(varCols...),
		)
	}
}

// InsertOrIgnore generates a complete insert or ignore statement.
func InsertOrIgnore(cols ...sqlitegen.Column) Opt {
	if len(cols) == 0 {
		panic("INSERT OR IGNORE statement must have columns to insert")
	}
	return func(qb *queryBuilder) {
		var table sqlitegen.Table

		varCols := make([]interface{}, len(cols))
		for i, c := range cols {
			if i == 0 {
				table = qb.schema.GetColumnTable(c)
			} else {
				if table != qb.schema.GetColumnTable(c) {
					panic("BUG: inserting columns from unrelated tables")
				}
			}
			varCols[i] = VarCol(c)
		}

		qb.writeSegments(
			"INSERT OR IGNORE INTO", table, ListColShort(cols...), Line,
			"VALUES", List(varCols...),
		)
	}
}

// Results annotates SQL expressions or concrete columns to become outputs of a SQL query.
// The argument must be ResultOpt or Column.
func Results(rr ...any) Opt {
	return func(qb *queryBuilder) {
		for i, rv := range rr {
			var r ResultOpt

			switch rt := rv.(type) {
			case sqlitegen.Column:
				r = ResultCol(rt)
			case ResultOpt:
				r = rt
			default:
				panic("BUG: invalid result type")
			}

			res := r(qb.schema)
			qb.WriteString(res.SQL)
			if i < len(rr)-1 {
				qb.WriteString(", ")
			}
			qb.AddOutput(sqlitegen.GoSymbol{
				Name: sqlitegen.GoNameFromSQLName(res.ColumnName, true),
				Type: res.Type,
			})
		}
	}
}

// ResultOpt is a functional option type for query Result.
type ResultOpt func(sqlitegen.Schema) Result

// Result describes a result of a SQL query.
type Result struct {
	// SQL is a raw expression, i.e. column name or expression aliased with an AS SQL clause.
	SQL string
	// ColumnName name of the column or alias.
	ColumnName string
	// Type is the data type that should be used in the generated code.
	Type sqlitegen.Type
}

// ResultCol annotates a Column to be a result of a query.
func ResultCol(col sqlitegen.Column) ResultOpt {
	return func(s sqlitegen.Schema) Result {
		return Result{
			SQL:        string(col),
			ColumnName: string(col),
			Type:       s.GetColumnType(col),
		}
	}
}

// ResultColShort annotates a Column's short name to be a result of a query.
func ResultColShort(col sqlitegen.Column) ResultOpt {
	return func(s sqlitegen.Schema) Result {
		return Result{
			SQL:        col.ShortName(),
			ColumnName: col.ShortName(),
			Type:       s.GetColumnType(col),
		}
	}
}

// ResultColAlias renames a column with an alias.
func ResultColAlias(col sqlitegen.Column, as string) ResultOpt {
	return func(s sqlitegen.Schema) Result {
		return Result{
			SQL:        string(col) + " AS " + as,
			ColumnName: as,
			Type:       s.GetColumnType(col),
		}
	}
}

// ResultRaw annotates a raw SQL expression to be a result of a query.
func ResultRaw(sql, columnName string, t sqlitegen.Type) ResultOpt {
	return func(s sqlitegen.Schema) Result {
		return Result{SQL: sql, ColumnName: columnName, Type: t}
	}
}

// ResultExpr is a SQL expression that is annotated as a query result.
//
// For example: ResultExpr("COUNT(*)", "count", sqlitegen.Int).
func ResultExpr(expr string, as string, goType sqlitegen.Type) ResultOpt {
	return func(sqlitegen.Schema) Result {
		return Result{
			SQL:        expr + " AS " + as,
			ColumnName: as,
			Type:       goType,
		}
	}
}

// SQLFunc is convenience function that assembles a string that represents a call
// to a SQL function with the given args. Can be useful to call SQL functions with
// constants of sqlitegen.Column type, but it can be any string.
//
// For example: SQLFunc("MAX", "1", "2", "3") => "MAX(1, 2, 3)".
func SQLFunc(funcName string, args ...string) string {
	return funcName + "(" + strings.Join(args, ", ") + ")"
}

// Var creates a binding parameter to be passed to the prepared SQL statements during execution.
// It requires to specify the type so that we know which one to use in the generated code.
func Var(name string, goType sqlitegen.Type) Opt {
	return func(qb *queryBuilder) {
		sym := sqlitegen.GoSymbol{
			Name: name,
			Type: goType,
		}
		qb.AddInput(sym)
		qb.WriteString(":" + sym.Name)
	}
}

// Quote wraps string in single quotes.
func Quote(s string) Opt {
	return func(qb *queryBuilder) {
		qb.WriteRune('\'')
		qb.WriteString(s)
		qb.WriteRune('\'')
	}
}

// VarCol creates a binding parameter to be passed when preparing SQL statement. It reuses
// the data type of the column using the schema.
func VarCol(col sqlitegen.Column) Opt {
	return func(qb *queryBuilder) {
		sym := sqlitegen.GoSymbol{
			Name: sqlitegen.GoNameFromSQLName(col.String(), false),
			Type: qb.schema.GetColumnType(col),
		}
		qb.AddInput(sym)
		qb.WriteString(":" + sym.Name)
	}
}

// VarColType is the same as VarCol but forces the type.
func VarColType(col sqlitegen.Column, t sqlitegen.Type) Opt {
	return func(qb *queryBuilder) {
		sym := sqlitegen.GoSymbol{
			Name: sqlitegen.GoNameFromSQLName(col.String(), false),
			Type: t,
		}
		qb.AddInput(sym)
		qb.WriteString(":" + sym.Name)
	}
}

// Indent doesn't do anything special and just writes the segments that were given.
// It's useful for visual indentation of a query though, and can help organize
// large join clauses and others into nested logical blocks.
func Indent(vv ...interface{}) Opt {
	return func(qb *queryBuilder) {
		qb.writeSegments(vv...)
	}
}

// Coalesce wraps a nd b into a COALESCE SQL function.
func Coalesce(a, b interface{}) Opt {
	if a == nil || b == nil {
		panic("BUG: bad coalesce, must pass two args")
	}

	return func(qb *queryBuilder) {
		afn, _ := newSegment(qb.schema, a)
		bfn, _ := newSegment(qb.schema, b)

		qb.WriteString("COALESCE(")
		afn(qb)
		qb.WriteString(", ")
		bfn(qb)
		qb.WriteString(")")
	}
}

// LookupSubQuery is a subquery to lookup a single value of c in t
// wrapped in a coalesce to ensure NULL is detected properly.
func LookupSubQuery(c sqlitegen.Column, t sqlitegen.Table, extra ...interface{}) Opt {
	sq := []interface{}{"SELECT", c, "FROM", t}
	sq = append(sq, extra...)
	sq = append(sq, "LIMIT 1")

	return Coalesce(SubQuery(sq...), "-1000")
}
