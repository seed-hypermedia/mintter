package sqlitedb

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

func makeDB(t *testing.T) *sqlitex.Pool {
	dir, err := ioutil.TempDir("", "sqlitedb")
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, os.RemoveAll(dir)) })

	p, err := sqlitex.Open(filepath.Join(dir, "db.sqlite"), 0, 5)
	require.NoError(t, err)
	return p
}
