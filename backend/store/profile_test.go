package store

import (
	"context"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"mintter/backend/identity"

	"github.com/stretchr/testify/require"
)

func TestProfileCache(t *testing.T) {
	repoPath, err := ioutil.TempDir("", t.Name())
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(repoPath))
	})

	prof := testProfile(t)

	pc := &profileCache{filename: filepath.Join(repoPath, "profile.json")}

	_, err = pc.load()
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
	store := testStore(t)
	prof := store.prof
	ctx := context.Background()

	require.NoError(t, store.StoreProfile(ctx, prof))

	pp, err := store.GetProfile(ctx, prof.ID)
	require.NoError(t, err)
	require.Equal(t, prof.ID, pp.ID)
}

func TestListProfiles(t *testing.T) {
	store := testStore(t)
	ctx := context.Background()
	prof := store.prof

	require.NoError(t, store.StoreProfile(ctx, prof))

	list, err := store.ListProfiles(ctx, 0, 0)
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.Equal(t, prof, list[0])
}

func testStore(t *testing.T) *Store {
	t.Helper()
	dir, err := ioutil.TempDir("", t.Name())
	require.NoError(t, err)

	prof := testProfile(t)

	s, err := Create(dir, prof)
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, s.Close())
		require.NoError(t, os.RemoveAll(dir))
	})

	return s
}

func testProfile(t *testing.T) identity.Profile {
	words := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}

	p, err := identity.FromMnemonic(words, nil, 0)
	require.NoError(t, err)

	return p
}
