package backend

import (
	"os"
	"testing"

	"mintter/backend/daemon/ondisk"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func makeTestRepo(t *testing.T, tt Tester) *repo {
	t.Helper()

	dir := testutil.MakeRepoPath(t)

	log, err := zap.NewDevelopment(zap.WithCaller(false))
	require.NoError(t, err)

	repo, err := ondisk.NewOnDiskWithDeviceKey(dir, log, tt.Device.Wrapped())
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(dir))
		err := log.Sync()
		_ = err
	})

	return repo
}
