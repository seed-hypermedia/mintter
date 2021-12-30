package sqlitex

import (
	"context"
	"fmt"

	"crawshaw.io/sqlite"
)

// WithTx executes fn within an immediate transaction, and commits
// or rolls back accordingly.
func WithTx(conn *sqlite.Conn, fn func(*sqlite.Conn) error) error {
	if err := Exec(conn, "BEGIN IMMEDIATE TRANSACTION;", nil); err != nil {
		return err
	}

	if err := fn(conn); err != nil {
		if rberr := Exec(conn, "ROLLBACK", nil); rberr != nil {
			return fmt.Errorf("ROLLBACK error: %v; original error: %w", rberr, err)
		}
		return err
	}

	return Exec(conn, "COMMIT", nil)
}

// WithTx executes fn within an immediate transaction using a new connection from the pool.
func (p *Pool) WithTx(ctx context.Context, fn func(*sqlite.Conn) error) error {
	conn, release, err := p.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return WithTx(conn, fn)
}
