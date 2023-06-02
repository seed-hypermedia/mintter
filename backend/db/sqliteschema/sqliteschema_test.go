package sqliteschema

import (
	"context"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

func TestMigrate(t *testing.T) {
	pool := makeDB(t)
	conn, release, err := pool.Conn(context.Background())
	require.NoError(t, err)
	defer release()
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

func TestRemoveSQLComments(t *testing.T) {
	in := `CREATE TABLE content_links (
		source_document_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		source_block_id TEXT NOT NULL,
		-- In theory this is not needed, because source_change_id will always be the correct version.
		-- but to simplify the queries we store it here too.
		source_version TEXT NOT NULL,
		source_change_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		target_document_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		target_block_id TEXT NOT NULL,
		target_version TEXT NOT NULL,
		PRIMARY KEY (target_document_id, target_block_id, target_version, source_document_id, source_block_id, source_change_id)
	) WITHOUT ROWID;`

	want := `CREATE TABLE content_links (
	source_document_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
	source_block_id TEXT NOT NULL,
	source_version TEXT NOT NULL,
	source_change_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
	target_document_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
	target_block_id TEXT NOT NULL,
	target_version TEXT NOT NULL,
	PRIMARY KEY (target_document_id, target_block_id, target_version, source_document_id, source_block_id, source_change_id)
) WITHOUT ROWID;`

	require.Equal(t, want, removeSQLComments(in))
}

func makeDB(t *testing.T) *sqlitex.Pool {
	pool, err := Open("file::memory:?mode=memory", 0, 1)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, pool.Close()) })

	return pool
}
