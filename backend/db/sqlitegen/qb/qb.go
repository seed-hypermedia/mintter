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
func MakeQuery(name string, s sqlitegen.Schema, vv ...interface{}) sqlitegen.QueryTemplate {
	qt := sqlitegen.QueryTemplate{
		Name: name,
	}

	newLine := true
	for i, v := range vv {
		needSpace := !newLine && i > 0 && i < len(vv)-1
		var fn func()

		switch opt := v.(type) {
		case string:
			fn = func() { qt.WriteString(opt) }
			if opt == "\n" {
				newLine = true
				needSpace = false
			} else {
				newLine = false
			}
		case rune:
			fn = func() { qt.WriteRune(opt) }
			newLine = false
			if opt == '\n' {
				newLine = true
				needSpace = false
			} else {
				newLine = false
			}
		case Opt:
			fn = func() { opt(s, &qt) }
			newLine = false
		case sqlitegen.Column:
			fn = func() { qt.WriteString(string(opt)) }
			newLine = false
		case sqlitegen.Table:
			fn = func() { qt.WriteString(string(opt)) }
			newLine = false
		default:
			panic(fmt.Sprintf("unexpected type: %T", v))
		}

		if needSpace {
			qt.WriteString(" ")
		}

		fn()
	}

	return qt
}

// Opt is a functional option type that modifies query template.
type Opt func(sqlitegen.Schema, *sqlitegen.QueryTemplate)

// Results annotates SQL expressions or concrete columns to become outputs of a SQL query.
func Results(rr ...ResultOpt) Opt {
	return func(s sqlitegen.Schema, qt *sqlitegen.QueryTemplate) {
		for i, r := range rr {
			res := r(s)
			qt.WriteString(res.SQL)
			if i < len(rr)-1 {
				qt.WriteString(", ")
			}
			qt.Outputs = append(qt.Outputs, sqlitegen.GoSymbol{
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
	return func(s sqlitegen.Schema, qt *sqlitegen.QueryTemplate) {
		qt.Inputs = append(qt.Inputs, sqlitegen.GoSymbol{
			Name: name,
			Type: goType,
		})

		qt.WriteString("?")
	}
}

// VarCol creates a binding parameter to be passed when preparing SQL statement. It reuses
// the data type of the column using the schema.
func VarCol(col sqlitegen.Column) Opt {
	return func(s sqlitegen.Schema, qt *sqlitegen.QueryTemplate) {
		qt.Inputs = append(qt.Inputs, sqlitegen.GoSymbol{
			Name: sqlitegen.GoNameFromSQLName(col.String(), false),
			Type: s.GetColumnType(col),
		})
		qt.WriteString("?")
	}
}
