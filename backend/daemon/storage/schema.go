package storage

import (
	_ "embed"
)

// Types for the lookup table.
// Needs to be an integer, but we're using
// unicode code points which are easier to remember.
const (
	LookupLiteral   = int('l')
	LookupPublicKey = int('p')
	LookupResource  = int('r')
)

//go:embed schema.sql
var schema string

func init() {
	schema = removeSQLComments(schema)
}

func init() {
	// Overwriting types for columns that we left unspecified, so our query codegen can actually work.
	col := Schema.Columns[EntitiesEID]
	col.SQLType = "TEXT"
	Schema.Columns[EntitiesEID] = col

	col = Schema.Columns[KeyDelegationsIssuer]
	col.SQLType = "INTEGER"
	Schema.Columns[KeyDelegationsIssuer] = col

	col = Schema.Columns[KeyDelegationsDelegate]
	col.SQLType = "INTEGER"
	Schema.Columns[KeyDelegationsDelegate] = col

	col = Schema.Columns[BlobAttrsExtra]
	col.SQLType = "BLOB"
	Schema.Columns[BlobAttrsExtra] = col
}
