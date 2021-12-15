package sqlitebs

import (
	"context"

	"crawshaw.io/sqlite"
)

type contextKey int

const contextKeyConn contextKey = 0

// ContextWithConn creates a context with a given conntext.
// This can be used to perform blockstore operations in the same transaction with some others.
func ContextWithConn(ctx context.Context, conn *sqlite.Conn) context.Context {
	return context.WithValue(ctx, contextKeyConn, conn)
}

// ConnFromContext attempts to retrieve connection from a context.
func ConnFromContext(ctx context.Context) (conn *sqlite.Conn, ok bool) {
	conn, ok = ctx.Value(contextKeyConn).(*sqlite.Conn)
	return conn, ok
}
