package store

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"
	"time"

	"mintter/backend/identity"

	"github.com/stretchr/testify/require"
)

func TestProfileCache(t *testing.T) {
	repoPath := fmt.Sprintf("test-repo-%d", time.Now().UnixNano())
	repoPath = filepath.Join(os.TempDir(), repoPath)
	require.NoError(t, os.MkdirAll(repoPath, 0700))

	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(repoPath))
	})

	prof := testProfile(t)

	pc := &profileCache{filename: filepath.Join(repoPath, "profile.json")}

	_, err := pc.load()
	require.Error(t, err, "loading non-existing profile must fail")

	err = pc.store(prof)
	require.NoError(t, err)

	p, err := pc.load()
	require.NoError(t, err)
	require.Equal(t, prof, p)

	prof.About.Email = "foo@example.com"
	err = pc.store(prof)
	require.NoError(t, err)

	p, err = pc.load()
	require.NoError(t, err)
	require.Equal(t, prof, p)

	// Loading from existing file must work.
	pc = &profileCache{filename: filepath.Join(repoPath, "profile.json")}
	p, err = pc.load()
	require.NoError(t, err)
	require.Equal(t, prof, p)
}

func TestStoreProfile(t *testing.T) {
	dir, err := ioutil.TempDir("", t.Name())
	require.NoError(t, err)
	defer func() {
		require.NoError(t, os.RemoveAll(dir))
	}()

	ctx := context.Background()
	prof := testProfile(t)

	store, err := Create(dir, prof)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, store.Close())
	}()

	require.NoError(t, store.StoreProfile(ctx, prof))

	pp, err := store.GetProfile(ctx, prof.ID)
	require.NoError(t, err)
	require.Equal(t, prof.ID, pp.ID)
}

func testProfile(t *testing.T) identity.Profile {
	words := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}

	p, err := identity.FromMnemonic(words, nil, 0)
	require.NoError(t, err)

	return p
}
