//go:build codegen
// +build codegen

package sqliteschema

import (
	"io/ioutil"
	"mintter/backend/db/sqlitegen"
	"os"
	"path/filepath"

	"crawshaw.io/sqlite"
)

func init() {
	sqlitegen.AddInitialism(
		"IPFS",
		"CID",
	)
}

func generateSchema() error {
	dir, err := ioutil.TempDir("", "sqliteschema-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)

	conn, err := sqlite.OpenConn(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := Migrate(conn); err != nil {
		return err
	}

	schema, err := sqlitegen.IntrospectSchema(conn)
	if err != nil {
		return err
	}

	// We need to manually set types for backlinks table,
	// because it's a virtual table and there's no type information
	// available inside the SQLite's table info.
	{
		col := sqlitegen.Column("backlinks.id")
		info := schema.Columns[col]
		info.SQLType = "INTEGER"
		schema.Columns[col] = info
	}
	{
		col := sqlitegen.Column("backlinks.depth")
		info := schema.Columns[col]
		info.SQLType = "INTEGER"
		schema.Columns[col] = info
	}

	code := sqlitegen.CodegenSchema("sqliteschema", schema)

	return ioutil.WriteFile("schema.gen.go", code, 0666)
}
