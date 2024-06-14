package schema

import (
	"io/ioutil"
	"os"
	"path/filepath"

	"seed/backend/pkg/sqlitegen"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/multierr"
)

var _ = generateSchema

//go:generate gorun -tags codegen generateSchema
func generateSchema() (err error) {
	conn, closer, err := MakeConn()
	if err != nil {
		return err
	}
	defer func() {
		err = multierr.Append(err, closer())
	}()

	schema, err := sqlitegen.IntrospectSchema(conn)
	if err != nil {
		return err
	}

	code, err := sqlitegen.CodegenSchema("schema", schema)
	if err != nil {
		return err
	}

	return ioutil.WriteFile("schema.gen.go", code, 0600)
}

// MakeConn creates a test connection with an example schema.
func MakeConn() (conn *sqlite.Conn, closer func() error, err error) {
	dir, err := ioutil.TempDir("", "sqlitegen-")
	if err != nil {
		return nil, nil, err
	}
	defer func() {
		if err != nil {
			os.RemoveAll(dir)
		}
	}()

	conn, err = sqlite.OpenConn(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		return nil, nil, err
	}
	defer func() {
		if err != nil {
			conn.Close()
		}
	}()

	err = sqlitex.ExecScript(conn, `
CREATE TABLE wallets (
	id TEXT PRIMARY KEY,
	name TEXT
);

CREATE TABLE users (
	id INTEGER PRIMARY KEY,
	name TEXT,
	avatar BLOB
);
`)
	if err != nil {
		return nil, nil, err
	}

	return conn, func() error {
		return multierr.Combine(
			os.RemoveAll(dir),
			conn.Close(),
		)
	}, nil
}
