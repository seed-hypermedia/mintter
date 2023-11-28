package storage

import (
	"context"
	"fmt"
	"testing"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

func TestSchemaForeignKeyIndexes(t *testing.T) {
	// This test makes sure that all child foreign key columns are covered by at least one index.
	// Sometimes not having one could be justified, e.g. when the child table is very small, and not expensive to full scan,
	// but on the other hand, the overhead of having an index for these small tables would be even smaller. So it's probably
	// easier to just have a rule to make these columns always indexed.

	db, err := OpenSQLite("file::memory:?mode=memory&cache=shared", 0, 1)
	require.NoError(t, err)
	defer db.Close()

	ctx := context.Background()
	require.NoError(t, InitSQLiteSchema(db))

	conn, release, err := db.Conn(ctx)
	require.NoError(t, err)
	defer release()

	introspectSchema(t, conn)
}

func introspectSchema(t *testing.T, conn *sqlite.Conn) {
	// Iterate over all the tables in the schema.
	err := sqlitex.Exec(conn, "SELECT name FROM sqlite_master WHERE type = 'table';", func(stmt *sqlite.Stmt) error {
		tableName := stmt.ColumnText(0)

		// For each table iterate over all the foreign keys constraints defined.
		err := sqlitex.Exec(conn, fmt.Sprintf("PRAGMA foreign_key_list(%s);", tableName), func(foreignKeysStmt *sqlite.Stmt) error {
			from := foreignKeysStmt.ColumnText(3)

			// Across all the indexes defined on the table, check if the foreign key column is covered at least by one index.
			var found bool
			err := sqlitex.Exec(conn, fmt.Sprintf("PRAGMA index_list(%s);", tableName), func(indexesStmt *sqlite.Stmt) error {
				indexName := indexesStmt.ColumnText(1)

				// For compound indexes we only care about the first indexed column.
				err := sqlitex.Exec(conn, fmt.Sprintf("SELECT * FROM pragma_index_info('%s') WHERE seqno = 0;", indexName), func(indexColumnsStmt *sqlite.Stmt) error {
					columnName := indexColumnsStmt.ColumnText(2)
					if columnName == from {
						found = true
						return nil
					}
					return nil
				})
				if err != nil {
					return err
				}

				return nil
			})
			if err != nil {
				return err
			}

			if !found {
				t.Errorf("Table %q foreign key on column %q is not covered by any index", tableName, from)
			}
			return nil
		})
		if err != nil {
			return err
		}
		return nil
	})
	require.NoError(t, err)
}
