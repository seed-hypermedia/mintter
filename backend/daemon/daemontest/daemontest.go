package daemontest

import (
	"mintter/backend/core/coretest"
	"mintter/backend/daemon/storage"
	"mintter/backend/testutil"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// MakeTestRepo creates a new testing repository.
func MakeTestRepo(t *testing.T, tt coretest.Tester) *storage.Dir {
	t.Helper()

	dir := testutil.MakeRepoPath(t)

	log, err := zap.NewDevelopment(zap.WithCaller(false))
	require.NoError(t, err)

	repo, err := storage.NewWithDeviceKey(dir, log, tt.Device.Wrapped())
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(dir))
		err := log.Sync()
		_ = err
	})

	require.NoError(t, repo.Migrate())

	return repo
}
