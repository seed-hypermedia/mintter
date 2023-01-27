// Package sqliteschema defines the Mintter-specific schema for SQLite
// and provides utilities for executing schema migration.
package sqliteschema

import (
	"context"
	"fmt"
	"mintter/backend/db/sqlitegen"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/multierr"
)

func init() {
	sqlitegen.AddInitialism(
		"IPFS",
		"CID",
		"SQLite",
		"IPLD",
	)
}

// Open a connection pool for SQLite, enabling some needed functionality for our schema
// like foreign keys.
func Open(uri string, flags sqlite.OpenFlags, poolSize int) (*sqlitex.Pool, error) {
	return open(uri, flags, poolSize,
		"PRAGMA encoding = \"UTF-8\";",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA journal_mode = WAL;",
	)
}

func open(uri string, flags sqlite.OpenFlags, poolSize int, prelude ...string) (*sqlitex.Pool, error) {
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

// Migrate the database applying migrations defined in this package.
// migration is done in a transaction.
func Migrate(conn *sqlite.Conn) error {
	return migrate(conn, migrations)
}

// MigratePool is like Migrate but accepts a pool instead of a conn.
// Often it's more convenient.
func MigratePool(ctx context.Context, pool *sqlitex.Pool) error {
	conn, release, err := pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return Migrate(conn)
}

func migrate(conn *sqlite.Conn, migrations []string) error {
	v, err := getUserVersion(conn)
	if err != nil {
		return err
	}

	if v == len(migrations) {
		return nil
	}

	if v > len(migrations) {
		return fmt.Errorf("refusing to migrate down from version %d to %d", v, len(migrations))
	}

	return withTx(conn, func(conn *sqlite.Conn) error {
		for _, script := range migrations[v:] {
			if err := sqlitex.ExecScript(conn, script); err != nil {
				return err
			}
		}

		return setUserVersion(conn, len(migrations))
	})
}

// TODO(burdiyan): call 'PRAGMA optimize' before closing connections.
// See: https://www.sqlite.org/lang_analyze.html.

func withTx(conn *sqlite.Conn, fn func(conn *sqlite.Conn) error) (err error) {
	if err := sqlitex.ExecTransient(conn, "BEGIN TRANSACTION;", nil); err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err == nil {
			err = sqlitex.ExecTransient(conn, "COMMIT;", nil)
		} else {
			err = multierr.Append(err, sqlitex.ExecTransient(conn, "ROLLBACK;", nil))
		}
	}()

	if err := fn(conn); err != nil {
		return err
	}

	return nil
}

func getUserVersion(conn *sqlite.Conn) (int, error) {
	var v int
	err := sqlitex.ExecTransient(conn, "PRAGMA user_version;", func(stmt *sqlite.Stmt) error {
		v = stmt.ColumnInt(0)
		return nil
	})
	return v, err
}

func setUserVersion(conn *sqlite.Conn, v int) error {
	return sqlitex.ExecTransient(conn, fmt.Sprintf("PRAGMA user_version = %d;", v), nil)
}
