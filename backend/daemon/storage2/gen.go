//go:build codegen
// +build codegen

package storage

import (
	"context"
	"io/ioutil"
	"seed/backend/pkg/sqlitegen"
)

func init() {
	sqlitegen.AddInitialism(
		"IPFS",
		"CID",
		"SQLite",
		"IPLD",
		"EID",
		"JSON",
		"KV",
		"HLC",
		"URL",
		"IRI",
	)
}

func generateSchema() error {
	db, err := OpenSQLite("file::memory:?mode=memory&cache=shared", 0, 1)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := InitSQLiteSchema(db); err != nil {
		return err
	}

	conn, release, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer release()

	schema, err := sqlitegen.IntrospectSchema(conn)
	if err != nil {
		return err
	}

	code, err := sqlitegen.CodegenSchema("storage", schema)
	if err != nil {
		return err
	}

	return ioutil.WriteFile("schema.gen.go", code, 0666)
}
