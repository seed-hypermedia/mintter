// Package storage manages persistent storage of the Seed daemon.
package storage

import (
	"fmt"
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
func Open(dataDir string, device crypto.PrivKey, kms core.KeyStore, logLevel string) (r *Store, err error) {
	log := logging.New("seed/repo", logLevel)
	r, err = newStore(dataDir, log)
	if err != nil {
		return nil, err
	}
	r.kms = kms

	if device != nil {
		r.device, err = core.NewKeyPair(device)
		if err != nil {
			return nil, err
		}
	}

	// TODO(hm24): This should probably be called from the outside somehow,
	// because we want to provide the feedback about the migration and reindexing
	// to the frontend that would call the Daemon API polling until everything is ready.
	if err := r.Migrate(); err != nil {
		return nil, err
	}

	return r, nil
}

// Close the storage.
func (s *Store) Close() error {
	return s.db.Close()
}

// newStore creates a newStore storage directory.
func newStore(path string, log *zap.Logger) (s *Store, err error) {
	if !filepath.IsAbs(path) {
		return nil, fmt.Errorf("must provide absolute repo path, got = %s", path)
	}

	s = &Store{
		path: path,
		log:  log,
	}

	ver, err := readVersionFile(s.path)
	if err != nil {
		return nil, fmt.Errorf("failed to read version file: %w", err)
	}

	// TODO(burdiyan): this ended up being unnecessarily messy.
	if ver == "" {
		if _, err := s.init(); err != nil {
			return nil, fmt.Errorf("failed to initialize data directory: %w", err)
		}
	} else {
		if s.db != nil {
			panic("BUG: db must not be set when starting a new store")
		}

		if err := s.initDB(); err != nil {
			return nil, err
		}
	}

	return s, nil
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

func (s *Store) sqlitePath() string {
	return filepath.Join(s.path, dbDir, "db.sqlite")
}

// Device returns the device key pair.
func (s *Store) Device() core.KeyPair {
	return s.device
}

func (s *Store) initDB() (err error) {
	poolSize := int(float64(runtime.NumCPU()) / 2)
	if poolSize == 0 {
		poolSize = 2
	}

	// The database is owned by the store, and is closed when the store is closed.
	s.db, err = OpenSQLite(s.sqlitePath(), 0, poolSize)
	if err != nil {
		return err
	}

	return nil
}
