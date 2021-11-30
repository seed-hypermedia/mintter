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

// QueryTemplate represents a template for a query.
// See qb package for building the query template.
type QueryTemplate struct {
	b strings.Builder

	Name    string
	Inputs  []GoSymbol
	Outputs []GoSymbol
}

// WriteString adds a string to the resulting query.
func (qt *QueryTemplate) WriteString(s string) {
	if _, err := qt.b.WriteString(s); err != nil {
		panic(err)
	}
}

// WriteRune adds a rune to the resulting query.
func (qt *QueryTemplate) WriteRune(r rune) {
	if _, err := qt.b.WriteRune(r); err != nil {
		panic(err)
	}
}

// SQL returns the resulting SQL statement.
func (qt *QueryTemplate) SQL() string {
	return qt.b.String()
}

// GoSymbol describes a Go variable with name and type.
type GoSymbol struct {
	Name string
	Type Type
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
