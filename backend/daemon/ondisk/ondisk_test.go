package ondisk

import (
	"errors"
	"io/ioutil"
	"path/filepath"
	"testing"

	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestMigrateRepo_OldLayout(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	require.NoError(t, ioutil.WriteFile(filepath.Join(dir, "profile.json"), []byte("{}"), 0600))

	_, err := NewOnDisk(dir, zap.NewNop())

	require.Error(t, err)
	require.Equal(t, ErrRepoMigrate, errors.Unwrap(err))
}

func TestMigrateRepo_WrongVersion(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	require.NoError(t, ioutil.WriteFile(filepath.Join(dir, "VERSION"), []byte("fake-version"), 0600))

	_, err := NewOnDisk(dir, zap.NewNop())

	require.Error(t, err)
	require.Equal(t, ErrRepoMigrate, errors.Unwrap(err))
}
