package backend

import (
	"errors"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestMigrateRepo_OldLayout(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	require.NoError(t, ioutil.WriteFile(filepath.Join(dir, "profile.json"), []byte("{}"), 0666))

	_, err := newRepo(dir, zap.NewNop())

	require.Error(t, err)
	require.True(t, errors.Is(err, errRepoMigrate))
}

func TestMigrateRepo_WrongVersion(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	require.NoError(t, ioutil.WriteFile(filepath.Join(dir, "VERSION"), []byte("fake-version"), 0666))

	_, err := newRepo(dir, zap.NewNop())

	require.Error(t, err)
	require.True(t, errors.Is(err, errRepoMigrate))
}

func makeTestRepo(t *testing.T, tt Tester) *repo {
	t.Helper()

	dir := testutil.MakeRepoPath(t)

	log, err := zap.NewDevelopment(zap.WithCaller(false))
	require.NoError(t, err)

	repo, err := newRepoWithDeviceKey(dir, log, tt.Device.priv)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(dir))
		err := log.Sync()
		_ = err
	})

	return repo
}
