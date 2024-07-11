// Package storage manages persistent storage of the Seed daemon.
package storage

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"seed/backend/core"
	"seed/backend/logging"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/libp2p/go-libp2p/core/crypto"
	"go.uber.org/zap"
)

// Store is a storage directory on a filesystem.
type Store struct {
	path string
	log  *zap.Logger

	device core.KeyPair

	db  *sqlitex.Pool
	kms core.KeyStore
}

// Open initializes the storage directory.
// Device can be nil in which case a random new device key will be generated.
// Users are responsible for calling Close() to release the resources.
func Open(dataDir string, device crypto.PrivKey, kms core.KeyStore, logLevel string) (_ *Store, err error) {
	log := logging.New("seed/repo", logLevel)

	if !filepath.IsAbs(dataDir) {
		return nil, fmt.Errorf("must provide absolute repo path, got = %s", dataDir)
	}

	{
		dirs := [...]string{
			filepath.Join(dataDir, keysDir),
			filepath.Join(dataDir, dbDir),
		}
		for _, d := range dirs {
			if err := os.MkdirAll(d, 0700); err != nil {
				return nil, fmt.Errorf("failed to create dir %s: %w", d, err)
			}
		}
	}

	db, err := newSQLite(sqlitePath(dataDir))
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			err = errors.Join(err, db.Close())
		}
	}()

	ver, err := readVersionFile(dataDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read version file: %w", err)
	}

	if ver == "" {
		if device == nil {
			kp, err := core.NewKeyPairRandom()
			if err != nil {
				return nil, fmt.Errorf("failed to generate device key pair: %w", err)
			}

			device = kp.Wrapped()
		}

		if err := InitSQLiteSchema(db); err != nil {
			return nil, fmt.Errorf("failed to initialize SQLite database: %w", err)
		}

		if err := writeDeviceKeyFile(dataDir, device); err != nil {
			return nil, err
		}

		if err := writeVersionFile(dataDir, desiredVersion()); err != nil {
			return nil, fmt.Errorf("failed to write version file to init data directory: %w", err)
		}
	}

	kp, err := readDeviceKeyFile(dataDir)
	if err != nil {
		return nil, fmt.Errorf("failed to check device key from file: %w", err)
	}

	if device != nil {
		if !kp.Wrapped().Equals(device) {
			return nil, fmt.Errorf("provided device key (%s) doesn't match the stored one (%s)", device, kp.Wrapped())
		}
	}

	s := &Store{
		path:   dataDir,
		log:    log,
		kms:    kms,
		device: kp,
		db:     db,
	}

	// TODO(hm24): This should probably be called from the outside somehow,
	// because we want to provide the feedback about the migration and reindexing
	// to the frontend that would call the Daemon API polling until everything is ready.
	if err := s.Migrate(); err != nil {
		return nil, err
	}

	return s, nil
}

// Close the storage.
func (s *Store) Close() error {
	return s.db.Close()
}

// DB returns the underlying database.
// Users must not close the database, because it's owned by the storage.
func (s *Store) DB() *sqlitex.Pool { return s.db }

// KeyStore returns the underlying key store.
func (s *Store) KeyStore() core.KeyStore { return s.kms }

// Migrate runs all migrations if needed.
// Must be called before using any other method of the storage.
func (s *Store) Migrate() error {
	ver, err := readVersionFile(s.path)
	if err != nil {
		return fmt.Errorf("failed to read version file: %w", err)
	}

	if ver == "" {
		panic("BUG: version file is empty when calling Migrate()")
	}

	if err := s.migrate(ver); err != nil {
		return fmt.Errorf("failed to migrate data directory: %w", err)
	}

	return nil
}

// Device returns the device key pair.
func (s *Store) Device() core.KeyPair {
	return s.device
}

func newSQLite(path string) (*sqlitex.Pool, error) {
	poolSize := int(float64(runtime.NumCPU()) / 2)
	if poolSize == 0 {
		poolSize = 2
	}

	// The database is owned by the store, and is closed when the store is closed.
	db, err := OpenSQLite(path, 0, poolSize)
	if err != nil {
		return nil, err
	}

	return db, nil
}

func sqlitePath(baseDir string) string {
	return filepath.Join(baseDir, dbDir, "db.sqlite")
}
