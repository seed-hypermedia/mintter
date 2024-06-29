package index

import (
	storage "seed/backend/daemon/storage2"
	"seed/backend/pkg/dqb"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDBQueries(t *testing.T) {
	db, err := storage.OpenSQLite("file::memory:?mode=memory", 0, 1)
	require.NoError(t, err)
	defer db.Close()
	require.NoError(t, storage.InitSQLiteSchema(db))
	require.NoError(t, dqb.GlobalQueries.Test(db))
}
