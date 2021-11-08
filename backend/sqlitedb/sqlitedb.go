package sqlitedb

import (
	"context"
	"fmt"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/multierr"
)

type Store struct {
	pool *sqlitex.Pool
}

// NewStore creates a new SQLite store using a given pool.
// Callers are responsible for calling Migrate before using the Store.
func NewStore(pool *sqlitex.Pool) *Store {
	s := &Store{
		pool: pool,
	}

	return s
}

// Migrate schema to the most up to date version. Migrating down is not supported.
func (s *Store) Migrate(ctx context.Context) error {
	return s.migrate(ctx, migrations)
}

// TODO: run periodic vacuum.

func (s *Store) migrate(ctx context.Context, migrations []Migration) error {
	conn := s.pool.Get(ctx)
	if conn == nil {
		return fmt.Errorf("sqlite pool is closed")
	}
	defer s.pool.Put(conn)

	v, err := s.getUserVersion(conn)
	if err != nil {
		return err
	}

	if v == len(migrations) {
		return nil
	}

	if v > len(migrations) {
		return fmt.Errorf("refusing to migrate down from version %d to %d", v, len(migrations))
	}

	return s.withTx(conn, func(conn *sqlite.Conn) error {
		for _, fn := range migrations[v:] {
			if err := fn(conn); err != nil {
				return err
			}
		}

		return s.setUserVersion(conn, len(migrations))
	})
}

func (s *Store) withTx(conn *sqlite.Conn, fn func(conn *sqlite.Conn) error) (err error) {
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

func (s *Store) getUserVersion(conn *sqlite.Conn) (int, error) {
	var v int
	err := sqlitex.ExecTransient(conn, "PRAGMA user_version;", func(stmt *sqlite.Stmt) error {
		v = stmt.ColumnInt(0)
		return nil
	})
	return v, err
}

func (s *Store) setUserVersion(conn *sqlite.Conn, v int) error {
	return sqlitex.ExecTransient(conn, fmt.Sprintf("PRAGMA user_version = %d;", v), nil)
}
