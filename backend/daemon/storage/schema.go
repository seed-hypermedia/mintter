package storage

import (
	_ "embed"
)

//go:embed schema.sql
var schema string

func init() {
	schema = removeSQLComments(schema)
}
