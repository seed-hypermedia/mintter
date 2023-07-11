package storage

import (
	"bytes"
	"mintter/backend/pkg/sqlitedbg"
	"mintter/backend/pkg/sqlitegen"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSchemaMatchPreMigrationsDir(t *testing.T) {
	old, err := OpenSQLite("./testdata/initial-data-dir/db/db.sqlite", 0, 1)
	require.NoError(t, err)
	defer old.Close()

	db := MakeTestDB(t)

	oldSchema, err := sqlitegen.IntrospectSchema(old)
	require.NoError(t, err)

	newSchema, err := sqlitegen.IntrospectSchema(db)
	require.NoError(t, err)

	require.Equal(t, oldSchema, newSchema)

	var (
		oldSQL bytes.Buffer
		newSQL bytes.Buffer
	)

	sqlitedbg.Exec(old, &oldSQL, "select sql from sqlite_schema")
	sqlitedbg.Exec(db, &newSQL, "select sql from sqlite_schema")

	require.Equal(t, strings.Replace(oldSQL.String(), "\t", "    ", -1), newSQL.String())
}
