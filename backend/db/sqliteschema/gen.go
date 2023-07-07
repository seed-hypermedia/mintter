//go:build codegen
// +build codegen

package sqliteschema

import (
	"io/ioutil"
	"mintter/backend/pkg/sqlitegen"
	"os"
	"path/filepath"

	"crawshaw.io/sqlite"
)

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

	code, err := sqlitegen.CodegenSchema("sqliteschema", schema)
	if err != nil {
		return err
	}

	return ioutil.WriteFile("schema.gen.go", code, 0666)
}
