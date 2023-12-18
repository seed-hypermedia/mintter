// Package storage manages persistent storage of the Mintter daemon.
package storage

import (
	"fmt"
	"mintter/backend/core"
	"mintter/backend/logging"
	"mintter/backend/pkg/future"
	"path/filepath"

	"github.com/libp2p/go-libp2p/core/crypto"
	"go.uber.org/zap"
)

// Dir is a storage directory on a filesystem.
type Dir struct {
	path string
	log  *zap.Logger

	device core.KeyPair
	me     future.Value[core.Identity]
}

// InitRepo initializes the storage directory.
// Device can be nil in which case a random new device key will be generated.
func InitRepo(dataDir string, device crypto.PrivKey, logLevel string) (r *Dir, err error) {
	log := logging.New("mintter/repo", logLevel)
	if device == nil {
		r, err = New(dataDir, log)
	} else {
		r, err = NewWithDeviceKey(dataDir, log, device)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to init storage: %w", err)
	}

	if err := r.Migrate(); err != nil {
		return nil, err
	}

	return r, nil
}

// New creates a new storage directory.
func New(path string, log *zap.Logger) (*Dir, error) {
	if !filepath.IsAbs(path) {
		return nil, fmt.Errorf("must provide absolute repo path, got = %s", path)
	}

	return &Dir{
		path: path,
		log:  log,

		me: future.New[core.Identity](),
	}, nil
}

// NewWithDeviceKey creates a new storage directory with device key.
func NewWithDeviceKey(path string, log *zap.Logger, pk crypto.PrivKey) (*Dir, error) {
	dir, err := New(path, log)
	if err != nil {
		return nil, err
	}

	kp, err := core.NewKeyPair(pk)
	if err != nil {
		return nil, err
	}

	dir.device = kp

	return dir, nil
}

// Migrate runs all migrations if needed.
// Must be called before using any other method of the storage.
func (d *Dir) Migrate() error {
	ver, err := readVersionFile(d.path)
	if err != nil {
		return fmt.Errorf("failed to read version file: %w", err)
	}

	if ver == "" {
		ver, err = d.init()
		if err != nil {
			return fmt.Errorf("failed to initialize data directory: %w", err)
		}
	}

	if err := d.migrate(ver); err != nil {
		return fmt.Errorf("failed to migrate data directory: %w", err)
	}

	return nil
}

// Identity returns the lazy value for a Mintter identity.
func (d *Dir) Identity() *future.ReadOnly[core.Identity] {
	return d.me.ReadOnly
}

// SQLitePath returns the file path to create the SQLite database.
func (d *Dir) SQLitePath() string {
	return filepath.Join(d.path, dbDir, "db.sqlite")
}

// Device returns the device key pair.
func (d *Dir) Device() core.KeyPair {
	return d.device
}
