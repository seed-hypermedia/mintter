package storage

import (
	"os"
	"seed/backend/pkg/sqlitedbg"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSQLite(t *testing.T) {
	pool, err := OpenSQLite("file::memory:?mode=memory&cache=shared", 0, 1)
	require.NoError(t, err)

	defer pool.Close()

	sqlitedbg.ExecPool(pool, os.Stdout, "select sha1('hello')")
	sqlitedbg.ExecPool(pool, os.Stdout, "select mycount() from (values (1), (2));")
}
