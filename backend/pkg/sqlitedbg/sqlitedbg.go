// Package sqlitedbg provides debugging facility for sqlite.
package sqlitedbg

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"text/tabwriter"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
)

// Exec a query and print the results into w.
func Exec[T *sqlitex.Pool | *sqlite.Conn](db T, w io.Writer, query string) {
	if w == nil {
		w = os.Stdout
	}

	var conn *sqlite.Conn

	switch v := any(db).(type) {
	case *sqlite.Conn:
		conn = v
	case *sqlitex.Pool:
		c, release, err := v.Conn(context.Background())
		if err != nil {
			panic(err)
		}
		defer release()
		conn = c
	}

	tw := tabwriter.NewWriter(w, 0, 0, 1, '.', tabwriter.TabIndent|tabwriter.Debug)

	var rows int
	err := sqlitex.Exec(conn, query, func(stmt *sqlite.Stmt) error {
		rows++
		cols := stmt.ColumnCount()
		for n := 0; n < cols; n++ {
			var txt string
			if stmt.ColumnType(n) == sqlite.SQLITE_BLOB {
				data := stmt.ColumnBytes(n)
				txt = base64.RawStdEncoding.EncodeToString(data)
			} else {
				txt = stmt.ColumnText(n)
			}

			fmt.Fprintf(w, "%s", txt)
			if n == cols-1 {
				fmt.Fprintf(w, "\n")
			} else {
				fmt.Fprintf(w, "\t")
			}
		}

		return nil
	})
	if err != nil {
		panic(err)
	}

	if err := tw.Flush(); err != nil {
		panic(err)
	}
}

// ExecPool is the same as Exec but uses the connection pool.
func ExecPool(db *sqlitex.Pool, w io.Writer, query string) {
	conn, release, err := db.Conn(context.Background())
	if err != nil {
		panic(err)
	}
	defer release()
	Exec(conn, w, query)
}
