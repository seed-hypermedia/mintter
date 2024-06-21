package backend

import (
	"context"
	"seed/backend/core"
	"seed/backend/daemon/storage"
	"seed/backend/hyper"
	"seed/backend/pkg/must"
	"seed/backend/testutil"
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
	testutil.Manual(t)

	dir, err := storage.Open("/tmp/seed-db-migrate-test", nil, core.NewMemoryKeyStore(), "debug")
	require.NoError(t, err)
	defer dir.Close()

	db := dir.DB()

	log := must.Do2(zap.NewDevelopment())

	blobs := hyper.NewStorage(db, log)
	require.NoError(t, blobs.Reindex(context.Background()))
}
