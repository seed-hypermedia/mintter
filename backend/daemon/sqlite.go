package daemon

import (
	"context"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/db/sqliteschema"

	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/fx"
)

func provideSQLite(lc fx.Lifecycle, r *ondisk.OnDisk) (*sqlitex.Pool, error) {
	pool, err := sqliteschema.Open(r.SQLitePath(), 0, 16)
	if err != nil {
		return nil, err
	}

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	if err := sqliteschema.Migrate(conn); err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return pool.Close()
		},
	})

	return pool, nil
}
