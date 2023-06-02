package sqliteschema

import (
	"context"
	"mintter/backend/testutil"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

// MakeTestDB is a test helper to use our database schema in tests.
func MakeTestDB(t testing.TB) *sqlitex.Pool {
	t.Helper()

	path := testutil.MakeRepoPath(t)

	pool, err := Open(filepath.Join(path, "db.sqlite"), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})
	require.NoError(t, MigratePool(context.Background(), pool))
	return pool
}
