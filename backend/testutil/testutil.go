package testutil

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"mintter/backend/identity"

	"github.com/stretchr/testify/require"
)

// MakeProfile from available test data.
func MakeProfile(t *testing.T, name string) identity.Profile {
	t.Helper()

	_, file, _, _ := runtime.Caller(0)
	dir := filepath.Dir(file)

	data, err := ioutil.ReadFile(dir + "/testdata/profiles/" + name + ".json")
	require.NoError(t, err)

	var p identity.Profile
	require.NoError(t, json.Unmarshal(data, &p))

	return p
}

// MakeRepoPath for testing..
func MakeRepoPath(t *testing.T) string {
	t.Helper()

	dir, err := ioutil.TempDir("", "mintter-repo")
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(dir))
	})

	return dir
}
