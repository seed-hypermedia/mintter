package storage

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"seed/backend/core"
	"seed/backend/core/coretest"
	"seed/backend/pkg/must"
	"seed/backend/pkg/sqlitedbg"
	"seed/backend/pkg/sqlitegen"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

func TestMigrateMatchesFreshSchema(t *testing.T) {
	// We have manually snapshot the data dir from before the migration framework was implemented.
	// It's stored in ./testdata/initial-data-dir.
	// We want to test that the data dir with all applied migrations matches the data dir created from scratch.
	// So we copy the initial snapshot to a temporary directory, apply all migrations to it,
	// and then compare it with a fresh directory.
	// If we need to break the compatibility, a new snapshot can be generated using `go run ./backend/cmd/mkdb`,
	// the resulting snapshot must be manually copied into the testdata directory (removing the previous snapshot first).

	tmpDir := t.TempDir()
	err := copyDir("./testdata/seed-test-db-snapshot", tmpDir)
	require.NoError(t, err)

	alice := coretest.NewTester("alice")

	oldDir, err := Open(tmpDir, alice.Device.Wrapped(), core.NewMemoryKeyStore(), "debug")
	require.NoError(t, err)
	require.NoError(t, oldDir.Migrate())
	defer oldDir.Close()

	newDir, err := Open(t.TempDir(), alice.Device.Wrapped(), core.NewMemoryKeyStore(), "debug")
	require.NoError(t, err)
	require.NoError(t, newDir.Migrate())
	defer newDir.Close()

	oldDB, newDB := oldDir.db, newDir.db

	oldSchema, err := sqlitegen.IntrospectSchema(oldDB)
	require.NoError(t, err)

	newSchema, err := sqlitegen.IntrospectSchema(newDB)
	require.NoError(t, err)

	require.Equal(t, oldSchema, newSchema)

	var (
		oldSQL bytes.Buffer
		newSQL bytes.Buffer
	)

	sqlitedbg.Exec(oldDB, &oldSQL, "select sql from sqlite_schema order by name")
	sqlitedbg.Exec(newDB, &newSQL, "select sql from sqlite_schema order by name")
	require.Equal(t, oldSQL.String(), newSQL.String())

	// We want to check that the version file matches the version of the last migration.
	require.Equal(t, migrations[len(migrations)-1].Version, must.Do2(readVersionFile(oldDir.path)))
	require.Equal(t, migrations[len(migrations)-1].Version, must.Do2(readVersionFile(newDir.path)))
}

func TestMigrationList(t *testing.T) {
	require.True(t, slices.IsSortedFunc(migrations, func(a, b migration) int {
		return strings.Compare(a.Version, b.Version)
	}), "the list of migrations must be sorted")

	out := slices.CompactFunc(migrations, func(a, b migration) bool {
		return a.Version == b.Version
	})
	if len(out) != len(migrations) {
		t.Fatalf("the list of migrations must not contain duplicates: %v", migrations)
	}
}

func copyDir(src, dst string) error {
	src = strings.TrimPrefix(src, "./")
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		dstPath := strings.Replace(path, src, dst, 1)

		if info.IsDir() {
			return os.MkdirAll(dstPath, 0750)
		}

		return copyFile(path, dstPath)
	})
}

func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	if err != nil {
		return err
	}

	return dstFile.Sync()
}
