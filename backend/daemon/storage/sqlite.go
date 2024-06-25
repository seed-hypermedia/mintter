package storage

import (
	"context"
	"path/filepath"
	"seed/backend/core"
	"seed/backend/daemon/storage/dbext"
	"seed/backend/testutil"
	"testing"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

import "C"

// OpenSQLite opens a connection pool for SQLite, enabling some needed functionality for our schema
// like foreign keys.
func OpenSQLite(uri string, flags sqlite.OpenFlags, poolSize int) (*sqlitex.Pool, error) {
	return openSQLite(uri, flags, poolSize,
		"PRAGMA foreign_keys = ON;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA journal_mode = WAL;",

		// Setting up some in-memory tables for materializing some query results temporarily.
		"ATTACH DATABASE ':memory:' AS mem;",
		"CREATE TABLE mem.changes (id INTEGER PRIMARY KEY);",
		"CREATE TABLE mem.change_deps (child INTEGER, parent INTEGER, PRIMARY KEY (child, parent), UNIQUE (parent, child)) WITHOUT ROWID;",
	)
}

func openSQLite(uri string, flags sqlite.OpenFlags, poolSize int, prelude ...string) (*sqlitex.Pool, error) {
	if err := dbext.LoadExtensions(); err != nil {
		return nil, err
	}

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

		conn.SetBusyTimeout(time.Minute * 3)

		return nil
	}); err != nil {
		return nil, err
	}

	return pool, nil
}

func initSQLite(conn *sqlite.Conn) error {
	return sqlitex.WithTx(conn, func() error {
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

// MakeTestRepo is a test helper to use our database schema in tests.
func MakeTestRepo(t testing.TB) *Store {
	t.Helper()

	path := testutil.MakeRepoPath(t)

	//u := coretest.NewTester("alice")

	repo, err := Open(path, nil, core.NewMemoryKeyStore(), "debug")
	require.NoError(t, err)

	return repo

}

// SetKV sets a key-value pair in the database.
func SetKV[T *sqlite.Conn | *sqlitex.Pool](ctx context.Context, db T, key, value string, replace bool) error {
	var conn *sqlite.Conn
	switch v := any(db).(type) {
	case *sqlite.Conn:
		conn = v
	case *sqlitex.Pool:
		c, release, err := v.Conn(ctx)
		if err != nil {
			return err
		}
		defer release()
		conn = c
	}

	if replace {
		return sqlitex.Exec(conn, "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);", nil, key, value)
	}

	return sqlitex.Exec(conn, "INSERT INTO kv (key, value) VALUES (?, ?);", nil, key, value)
}

// GetKV gets a key-value pair from the database.
func GetKV[T *sqlite.Conn | *sqlitex.Pool](ctx context.Context, db T, key string) (string, error) {
	var conn *sqlite.Conn
	switch v := any(db).(type) {
	case *sqlite.Conn:
		conn = v
	case *sqlitex.Pool:
		c, release, err := v.Conn(ctx)
		if err != nil {
			return "", err
		}
		defer release()
		conn = c
	}

	var value string
	err := sqlitex.Exec(conn, "SELECT value FROM kv WHERE key = ?;", func(stmt *sqlite.Stmt) error {
		value = stmt.ColumnText(0)
		return nil
	}, key)
	if err != nil {
		return "", err
	}

	return value, nil
}
