package sqliteschema

import (
	"context"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

func TestMigrate(t *testing.T) {
	pool := makeDB(t)
	conn := pool.Get(context.Background())
	defer pool.Put(conn)
	require.NoError(t, Migrate(conn))
	require.Error(t, migrate(conn, nil), "must refuse to rollback migrations")
}

func TestOpen_ForeignKeys(t *testing.T) {
	pool := makeDB(t)
	conn, release, err := pool.Conn(context.Background())
	require.NoError(t, err)
	defer release()

	err = sqlitex.ExecScript(conn, `
CREATE TABLE a (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE b (id INTEGER PRIMARY KEY, name TEXT NOT NULL, a_id REFERENCES a NOT NULL);
`)
	require.NoError(t, err)

	err = sqlitex.Exec(conn, `INSERT INTO a VALUES (?, ?);`, nil, 1, "a-1")
	require.NoError(t, err)

	err = sqlitex.Exec(conn, `INSERT INTO b VALUES (?, ?, ?)`, nil, 1, "b-1", 22)
	require.Error(t, err)
}

func makeDB(t *testing.T) *sqlitex.Pool {
	pool, err := Open("file::memory:?mode=memory", 0, 1)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, pool.Close()) })

	return pool
}
