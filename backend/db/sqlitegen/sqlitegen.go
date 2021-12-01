// Package sqlitegen provides code generation utilities for SQLite.
package sqlitegen

import (
	"strings"
)

var initialisms = map[string]struct{}{
	"ip":   {},
	"id":   {},
	"http": {},
}

// AddInitialism allows to add a custom initialism so that generated code knows about them.
func AddInitialism(ss ...string) {
	for _, s := range ss {
		s = strings.ToLower(s)
		initialisms[s] = struct{}{}
	}
}

func isInitialism(s string) bool {
	s = strings.ToLower(s)
	_, ok := initialisms[s]
	return ok
}

// QueryKind defines kinds of queries.
type QueryKind byte

const (
	// QueryKindSingle means that query returns a single row as a result.
	QueryKindSingle QueryKind = iota
	// QueryKindMany means that query returns multiple rows as a result.
	QueryKindMany
	// QueryKindExec means that query doesn't return any rows, but only an error.
	QueryKindExec
)

// QueryTemplate represents a template for a query.
// See qb package for building the query template.
type QueryTemplate struct {
	Name    string
	Kind    QueryKind
	SQL     string
	Inputs  []GoSymbol
	Outputs []GoSymbol
}

// GoSymbol describes a Go variable with name and type.
type GoSymbol struct {
	Name string
	Type Type
}

func (s GoSymbol) String() string {
	return s.Name + " " + s.Type.goString()
}

// GoNameFromSQLName converts a column name into a Go symbol name.
func GoNameFromSQLName(s string, exported bool) string {
	parts := strings.FieldsFunc(s, func(r rune) bool {
		return r == '_' || r == '.'
	})

	for i, p := range parts {
		if !exported && i == 0 {
			continue
		}

		if isInitialism(p) {
			parts[i] = strings.ToUpper(p)
			continue
		}

		parts[i] = strings.Title(p)
	}

	return strings.Join(parts, "")
}
