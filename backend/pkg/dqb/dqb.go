// Package dqb provides a dynamic query builder.
// This is an experiment to allow writing queries by hand and being able to validate them against a DB schema,
// to make sure they are valid and only reference correct tables and columns.
package dqb

import (
	"context"
	"fmt"
	"sync"

	"crawshaw.io/sqlite/sqlitex"
)

// GlobalQueries is a global storage of SQL queries.
var GlobalQueries Queries

// Q returns a memoized function that returns a SQL query string.
func Q(fn func() string) LazyQuery {
	return GlobalQueries.Q(fn)
}

// Str returns a memoized string query that will be formatted lazily.
func Str(s string) LazyQuery {
	return GlobalQueries.Str(s)
}

// LazyQuery is a memoized function that returns a SQL query string.
type LazyQuery func() string

// Queries is a storage of functions that memoizes the result of a function preparing a SQL query string.
type Queries struct {
	funcs []*onceFunc
}

// Q returns a memoized function that returns a SQL query string.
// The query will be dedented and SQL comments will be stripped.
func (q *Queries) Q(fn func() string) LazyQuery {
	idx := len(q.funcs)
	q.funcs = append(q.funcs, &onceFunc{fn: fn})
	return q.funcs[idx].Do
}

// Str returns a memoized string query that will be formatted lazily.
func (q *Queries) Str(s string) LazyQuery {
	return q.Q(func() string { return s })
}

// Test tests all the queries in the storage with a given connection
// by preparing them. This makes sure the queries are valid according to the DB schema.
func (q *Queries) Test(db *sqlitex.Pool) error {
	conn, release, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer release()

	for i := range q.funcs {
		q := q.funcs[i].Do()
		stmt, trailing, err := conn.PrepareTransient(q)
		if err != nil {
			return fmt.Errorf("failed preparing query: %w", err)
		}

		if trailing != 0 {
			return fmt.Errorf("query %s has some trailing bytes", q)
		}

		if err := stmt.Finalize(); err != nil {
			return err
		}
	}

	return nil
}

type onceFunc struct {
	once sync.Once
	fn   func() string
	val  string
}

func (o *onceFunc) Do() string {
	o.once.Do(func() {
		o.val = sqlfmt(o.fn())
	})
	return o.val
}
