package daemon

import (
	"mintter/backend/vcs"

	"crawshaw.io/sqlite/sqlitex"
)

func provideVCS(pool *sqlitex.Pool) *vcs.SQLite {
	return vcs.New(pool)
}
