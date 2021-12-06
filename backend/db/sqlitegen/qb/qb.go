// Package qb is a query builder for SQLite that supports annotations
// useful for the sqlitegen package. This package requires users to annotate their queries
// using some DSL-like wrappers, which allows understanding the inputs and outputs of a query
// without having to parse SQL and understand all the different intricacies that it involves.
package qb

import (
	"fmt"
	"mintter/backend/db/sqlitegen"
	"strings"
)

// MakeQuery creates a query templats that later can be used for generating the code that uses the query.
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
	qb := &queryBuilder{
		qt: sqlitegen.QueryTemplate{
			Name: name,
			Kind: kind,
		},
	}

	// This is a bit cumbersome, but I haven't found a better way. The idea is that we want to
	// add spaces between different segments, except before and after a line break. This allows us to add
	// line breaks that would generate a more pretty SQL statements in the generated code.
	// newSegment creates a function that is used to write into the query builder. It's done lazily, because
	// we need to determine first whether we need to add a space that separates segments. We add space BEFORE
	// we write the segment, which is a bit counter-intuitive. We also need to cache whether the previous segment
	// was a line break, so that we avoid writing the space on a new line. It would probably be easier to understand
	// if we could just step-back one space before writing the next one, but implementing it is actually a bit more complicated.
	prevNewLine := true
	for _, v := range vv {
		fn, isNewLine := newSegment(s, v)

		needSpace := !prevNewLine && !isNewLine

		if needSpace {
			qb.WriteRune(' ')
		}

		fn(qb)

		prevNewLine = isNewLine
	}

	return qb.Build()
}

func newSegment(s sqlitegen.Schema, v interface{}) (writeFunc func(*queryBuilder), isNewLine bool) {
	switch opt := v.(type) {
	case string:
		writeFunc = func(qb *queryBuilder) { qb.WriteString(opt) }
		if opt == "\n" {
			isNewLine = true
		}
	case rune:
		writeFunc = func(qb *queryBuilder) { qb.WriteRune(opt) }
		if opt == '\n' {
			isNewLine = true
		}
	case Opt:
		writeFunc = func(qb *queryBuilder) { opt(s, qb) }
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
	b  strings.Builder
	qt sqlitegen.QueryTemplate
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
type Opt func(sqlitegen.Schema, *queryBuilder)

// List accepts the same arguments as MakeQuery, but wraps them as a SQL list.
func List(vv ...interface{}) Opt {
	return func(s sqlitegen.Schema, qb *queryBuilder) {
		qb.WriteRune('(')
		for i, v := range vv {
			fn, _ := newSegment(s, v)
			fn(qb)
			if i < len(vv)-1 {
				qb.WriteString(", ")
			}
		}
		qb.WriteRune(')')
	}
}

// Sub creates a subquery. It accepts the same arguments as MakeQuery and List.
func Sub(vv ...interface{}) Opt {
	return func(s sqlitegen.Schema, qb *queryBuilder) {
		qb.WriteRune('(')
		for i, v := range vv {
			fn, isNewLine := newSegment(s, v)
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
	return func(s sqlitegen.Schema, qb *queryBuilder) {
		table := s.GetColumnTable(cols[0])

		qb.WriteString("INSERT INTO ")
		qb.WriteString(string(table))
		qb.WriteString(" (")

		for i, c := range cols {
			if table != s.GetColumnTable(c) {
				panic("trying to insert columns from different tables")
			}

			qb.WriteString(c.ShortName())
			if i < len(cols)-1 {
				qb.WriteString(", ")
			}
		}

		qb.WriteRune(')')
		qb.WriteRune('\n')
		qb.WriteString("VALUES (")
		for i, c := range cols {
			qb.WriteRune('?')
			if i < len(cols)-1 {
				qb.WriteString(", ")
			}

			qb.AddInput(sqlitegen.GoSymbol{
				Name: sqlitegen.GoNameFromSQLName(c.String(), false),
				Type: s.GetColumnType(c),
			})
		}
		qb.WriteRune(')')
	}
}

// Results annotates SQL expressions or concrete columns to become outputs of a SQL query.
func Results(rr ...ResultOpt) Opt {
	return func(s sqlitegen.Schema, qb *queryBuilder) {
		for i, r := range rr {
			res := r(s)
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
	return func(s sqlitegen.Schema, qb *queryBuilder) {
		qb.AddInput(sqlitegen.GoSymbol{
			Name: name,
			Type: goType,
		})
		qb.WriteString("?")
	}
}

// VarCol creates a binding parameter to be passed when preparing SQL statement. It reuses
// the data type of the column using the schema.
func VarCol(col sqlitegen.Column) Opt {
	return func(s sqlitegen.Schema, qb *queryBuilder) {
		qb.AddInput(sqlitegen.GoSymbol{
			Name: sqlitegen.GoNameFromSQLName(col.String(), false),
			Type: s.GetColumnType(col),
		})
		qb.WriteString("?")
	}
}
