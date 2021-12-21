package sqliteschema

import (
	"context"
	"testing"

	"crawshaw.io/sqlite"
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

func TestDraftsDeleteLinksTrigger(t *testing.T) {
	// SQLite triggers don't fail when you mistype the column names.
	// Here's a simple test for trg_drafts_delete_links trigger.

	pool, err := open("file::memory:?mode=memory", 0, 1)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, pool.Close()) })
	ctx := context.Background()
	require.NoError(t, MigratePool(ctx, pool))

	conn, release, err := pool.Conn(ctx)
	require.NoError(t, err)
	defer release()

	err = sqlitex.ExecScript(conn, `
INSERT INTO drafts (id, title, subtitle, content, create_time, update_time) VALUES (1, 'foo', 'bar', NULL, 10000, 10000);
INSERT INTO objects (id, multihash, codec, account_id) VALUES (1, 'doc-1', 1, 1);
INSERT INTO objects (id, multihash, codec, account_id) VALUES (2, 'doc-2', 1, 1);

INSERT INTO links (id, source_object_id, source_block_id, target_object_id, target_block_id, target_version)
VALUES (1, 1, 'b1', 2, 'b2', 'v1'), (2, 1, 'b1', 2, 'b3', 'v2');
`)
	require.NoError(t, err)

	err = sqlitex.Exec(conn, "DELETE FROM drafts", nil)
	require.NoError(t, err)

	err = sqlitex.Exec(conn, "SELECT * FROM links", func(stmt *sqlite.Stmt) error {
		t.Fatal("MUST NOT RETURN ROWS")
		return nil
	})
	require.NoError(t, err)
}

func makeDB(t *testing.T) *sqlitex.Pool {
	pool, err := Open("file::memory:?mode=memory", 0, 1)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, pool.Close()) })

	return pool
}
