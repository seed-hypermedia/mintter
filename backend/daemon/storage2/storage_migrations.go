package storage

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"seed/backend/core"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/libp2p/go-libp2p/core/crypto"

	"golang.org/x/exp/slices"
)

/*
Current data dir layout:

<data-dir>/
├─ db/
│  ├─ db.sqlite
├─ keys/
│  ├─ libp2p_id_ed25519
├─ seed-daemon.conf
├─ VERSION

When making changes to database schema or directory layout,
make sure to update the initialization code which creates everything from scratch,
and add the necessary migrations to drive the current state of the directory to the new desired state.
*/

// migration specifies the version of the desired state of the directory,
// and provides a run function to drive the directory to that state from the previous version.
// The Run function should be as idempotent as possible to avoid issues with partially applied migrations.
// The DB connection inside the Run function is already wrapped into an immediate write transaction.
type migration struct {
	Version string
	Run     func(*Store, *sqlite.Conn) error
}

// In order for a migration to actually run, it has to have a version higher than the version of the data directory.
// Care has to be taken when migrations are being added in main, and feature branches in parallel.
//
// It's important to backup your data directory when trying out the code from a feature branch that has a migration.
// Otherwise when you switch back to the main branch the program will complain about an unknown version of the data directory.
var migrations = []migration{
	// New beginning. While we're doing the HM24 migration we can still make some breaking changes.
	// TODO(burdiyan): add a real version when we are ready to release.
	{Version: "2024-06-20.hm24-dev-3", Run: func(d *Store, conn *sqlite.Conn) error {
		return nil
	}},
}

func desiredVersion() string {
	ver := migrations[len(migrations)-1].Version
	if ver == "" {
		panic("BUG: couldn't find the desired storage schema version")
	}

	return ver
}

const (
	keysDir = "keys"
	dbDir   = "db"

	devicePrivateKeyPath = keysDir + "/libp2p_id_ed25519"

	versionFilename = "VERSION"
)

func (s *Store) migrate(currentVersion string) error {
	desiredVersion := migrations[len(migrations)-1].Version
	if currentVersion > desiredVersion {
		return fmt.Errorf("OLD VERSION: you are running an old version of Seed: your data dir version is %q and it can't be downgraded to %q", currentVersion, desiredVersion)
	}

	// Running migrations if necessary.
	{
		idx, ok := slices.BinarySearchFunc(migrations, currentVersion, func(m migration, target string) int {
			if m.Version == target {
				return 0
			}

			if m.Version < target {
				return -1
			}

			return +1
		})
		if !ok {
			return fmt.Errorf("BREAKING CHANGE: this version of Seed is incompatible with your existing data: remove your data directory located in %q", s.path)
		}

		pending := migrations[idx+1:]
		if len(pending) > 0 {
			db := s.db

			conn, release, err := db.Conn(context.Background())
			if err != nil {
				return err
			}
			defer release()

			// Locking the database for the entire migration process.
			// We don't want to run all the migration in a single transaction, because it may get too big and cause problems.
			// We also want to prevent other connections from using the database until we are fully done with migrations.
			if err := sqlitex.ExecScript(conn, "PRAGMA locking_mode = EXCLUSIVE;"); err != nil {
				return err
			}

			for _, mig := range pending {
				// In case of a problem (e.g. power cut) we could end up with an applied migration,
				// but without the version file being written, in which case things will be bad.
				// To reduce this risk to some extent, we write the version file after each migration.
				//
				// TODO(burdiyan): maybe move the version information into the database so everything could be done atomically,
				// or implement some sort of recovery mechanism for these situations.

				if err := sqlitex.WithTx(conn, func() error {
					return mig.Run(s, conn)
				}); err != nil {
					return fmt.Errorf("failed to run migration %s: %w", mig.Version, err)
				}

				if err := writeVersionFile(s.path, mig.Version); err != nil {
					return fmt.Errorf("failed to write version file: %w", err)
				}
			}

			// We need to unlock the database so it be used after we've done the migration.
			// For locking mode changes to take effect we need to run some statement that accesses the file.
			if err := sqlitex.ExecScript(conn, "PRAGMA locking_mode = NORMAL; SELECT id FROM blobs LIMIT 1"); err != nil {
				return err
			}
		}
	}

	// Preparing the device key.
	{
		kp, err := readDeviceKeyFile(s.path)
		if err != nil {
			return fmt.Errorf("failed to load device key from file: %w", err)
		}

		if s.device.Wrapped() != nil {
			if !s.device.Wrapped().Equals(kp.Wrapped()) {
				return fmt.Errorf("device key loaded from file (%s) doesn't match the desired key (%s)", kp.PeerID(), s.device.PeerID())
			}
		} else {
			s.device = kp
		}
	}

	return nil
}

func readVersionFile(dir string) (string, error) {
	data, err := os.ReadFile(filepath.Join(dir, versionFilename))
	if errors.Is(err, os.ErrNotExist) {
		return "", nil
	}

	return string(data), err
}

func writeVersionFile(dir, version string) error {
	return os.WriteFile(filepath.Join(dir, versionFilename), []byte(version), 0600)
}

func writeDeviceKeyFile(dir string, pk crypto.PrivKey) error {
	data, err := crypto.MarshalPrivateKey(pk)
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(dir, devicePrivateKeyPath), data, 0600)
}

func readDeviceKeyFile(dir string) (kp core.KeyPair, err error) {
	data, err := os.ReadFile(filepath.Join(dir, devicePrivateKeyPath))
	if err != nil {
		return kp, fmt.Errorf("failed to read the file: %w", err)
	}

	pk, err := crypto.UnmarshalPrivateKey(data)
	if err != nil {
		return kp, fmt.Errorf("failed to unmarshal private key for device: %w", err)
	}

	return core.NewKeyPair(pk)
}
