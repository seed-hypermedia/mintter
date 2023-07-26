package storage

import (
	"bytes"
	"io"
	"mintter/backend/pkg/must"
	"mintter/backend/pkg/sqlitedbg"
	"mintter/backend/pkg/sqlitegen"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestMigrateMatchesFreshSchema(t *testing.T) {
	// We have manually snapshot the data dir from before the migration framework was implemented.
	// It's stored in ./testdata/initial-data-dir.
	// We want to test that the data dir with all applied migrations matches the data dir created from scratch.
	// So we copy the initial snapshot to a temporary directory, apply all migrations to it,
	// and then compare it with a fresh directory.

	tmpDir := t.TempDir()
	err := copyDir("./testdata/initial-data-dir", tmpDir)
	require.NoError(t, err)

	oldDir, err := New(tmpDir, zap.NewNop())
	require.NoError(t, err)
	require.NoError(t, oldDir.Migrate())

	newDir, err := New(t.TempDir(), zap.NewNop())
	require.NoError(t, err)
	require.NoError(t, newDir.Migrate())

	oldDB, err := OpenSQLite(oldDir.SQLitePath(), 0, 1)
	require.NoError(t, err)
	defer oldDB.Close()

	newDB, err := OpenSQLite(newDir.SQLitePath(), 0, 1)
	require.NoError(t, err)
	defer newDB.Close()

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
