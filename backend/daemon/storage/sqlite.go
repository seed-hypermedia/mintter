package storage

import (
	"context"
	"mintter/backend/testutil"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

// OpenSQLite opens a connection pool for SQLite, enabling some needed functionality for our schema
// like foreign keys.
func OpenSQLite(uri string, flags sqlite.OpenFlags, poolSize int) (*sqlitex.Pool, error) {
	return openSQLite(uri, flags, poolSize,
		"PRAGMA encoding = \"UTF-8\";",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA journal_mode = WAL;",
	)
}

func openSQLite(uri string, flags sqlite.OpenFlags, poolSize int, prelude ...string) (*sqlitex.Pool, error) {
	pool, err := sqlitex.Open(uri, flags, poolSize)
	if err != nil {
		return nil, err
	}

	if err := pool.ForEach(func(conn *sqlite.Conn) error {
		for _, stmt := range prelude {
			if err := sqlitex.ExecTransient(conn, stmt, nil); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return pool, nil
}

func initSQLite(conn *sqlite.Conn) error {
	return sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, schema)
	})
}

// InitSQLiteSchema initializes the database with the corresponding schema.
func InitSQLiteSchema[T *sqlite.Conn | *sqlitex.Pool](db T) error {
	var conn *sqlite.Conn
	switch v := any(db).(type) {
	case *sqlite.Conn:
		conn = v
	case *sqlitex.Pool:
		c, release, err := v.Conn(context.Background())
		if err != nil {
			return err
		}
		defer release()
		conn = c
	}

	return initSQLite(conn)
}

// MakeTestDB is a test helper to use our database schema in tests.
func MakeTestDB(t testing.TB) *sqlitex.Pool {
	t.Helper()

	path := testutil.MakeRepoPath(t)

	pool, err := OpenSQLite(filepath.Join(path, "db.sqlite"), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})
	require.NoError(t, InitSQLiteSchema(pool))
	return pool
}
