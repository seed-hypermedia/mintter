package backend

import (
	"context"
	"os"
	"seed/backend/daemon/storage"
	"seed/backend/hyper"
	"seed/backend/pkg/must"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestDBMigrateManual(t *testing.T) {
	// This is a convenience test for running manually
	// to verify the database migrations and indexing.
	// Run it from the command line as:
	//
	// ```
	// SEED_MANUAL_DB_MIGRATE_TEST=1 go test -run 'TestDBMigrateManual' ./backend -count=1 -v
	// ```
	//
	// Before running the test duplicate your entire production data directory to /tmp/seed-db-migrate-test.
	if os.Getenv("SEED_MANUAL_DB_MIGRATE_TEST") == "" {
		t.SkipNow()
		return
	}

	dir, err := storage.InitRepo("/tmp/seed-db-migrate-test", nil, "debug")
	require.NoError(t, err)

	_ = dir

	log := must.Do2(zap.NewDevelopment())

	db, err := storage.OpenSQLite(dir.SQLitePath(), 0, 1)
	require.NoError(t, err)
	defer db.Close()

	blobs := hyper.NewStorage(db, log)

	require.NoError(t, blobs.Reindex(context.Background()))
}
