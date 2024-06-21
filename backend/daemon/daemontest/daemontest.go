package daemontest

import (
	"os"
	"seed/backend/core"
	"seed/backend/core/coretest"
	"seed/backend/daemon/storage"
	"seed/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

// MakeTestRepo creates a new testing repository.
func MakeTestRepo(t *testing.T, tt coretest.Tester) *storage.Store {
	t.Helper()

	dir := testutil.MakeRepoPath(t)

	ks := core.NewMemoryKeyStore()

	repo, err := storage.Open(dir, tt.Device.Wrapped(), ks, "debug")
	require.NoError(t, err)
	t.Cleanup(func() {
		repo.Close()
		require.NoError(t, os.RemoveAll(dir))
	})

	return repo
}
