package backend

import (
	"context"
	"mintter/backend/daemon/storage"
	"mintter/backend/hyper"
	"mintter/backend/pkg/must"
	"os"
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
	// MINTTER_MANUAL_DB_MIGRATE_TEST=1 go test -run 'TestDBMigrateManual' ./backend -count=1 -v
	// ```
	//
	// Before running the test duplicate your entire production data directory to /tmp/mintter-db-migrate-test.
	if os.Getenv("MINTTER_MANUAL_DB_MIGRATE_TEST") == "" {
		t.SkipNow()
		return
	}

	dir, err := storage.InitRepo("/tmp/mintter-db-migrate-test", nil)
	require.NoError(t, err)

	_ = dir

	log := must.Do2(zap.NewDevelopment())

	db, err := storage.OpenSQLite(dir.SQLitePath(), 0, 1)
	require.NoError(t, err)
	defer db.Close()

	blobs := hyper.NewStorage(db, log)

	require.NoError(t, blobs.Reindex(context.Background()))
}
