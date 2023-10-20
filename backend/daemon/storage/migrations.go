package storage

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/core"
	"os"
	"path/filepath"

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
│  ├─ mintter_id_ed25519.pub
├─ mintterd.conf
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
	Run     func(*Dir, *sqlite.Conn) error
}

// In order for a migration to actually run, it has to have a version higher than the version of the data directory.
// Care has to be taken when migrations are being added in main, and feature branches in parallel.
//
// It's important to backup your data directory when trying out the code from a feature branch that has a migration.
// Otherwise when you switch back to the main branch the program will complain about an unknown version of the data directory.
var migrations = []migration{
	// New beginning.
	{Version: "2023-09-22.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return nil
	}},
	{Version: "2023-10-20.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE remote_sites;
			CREATE TABLE group_sites (
				group_id TEXT NOT NULL,
				url TEXT NOT NULL,
				hlc_time INTEGER NOT NULL,
				hlc_origin TEXT NOT NULL,
				remote_version TEXT NOT NULL DEFAULT (''),
				last_sync_time INTEGER NOT NULL DEFAULT (0),
				last_ok_sync_time INTEGER NOT NULL DEFAULT (0),
				last_sync_error TEXT NOT NULL DEFAULT (''),
				PRIMARY KEY (group_id)
			);
			DELETE FROM kv WHERE key = 'last_reindex_time';
		`))
	}},
}

const (
	keysDir = "keys"
	dbDir   = "db"

	devicePrivateKeyPath = keysDir + "/libp2p_id_ed25519"
	accountKeyPath       = keysDir + "/mintter_id_ed25519.pub"

	versionFilename = "VERSION"
)

func (d *Dir) init() (currentVersion string, err error) {
	dirs := [...]string{
		filepath.Join(d.path, keysDir),
		filepath.Join(d.path, dbDir),
	}

	currentVersion = migrations[len(migrations)-1].Version
	if currentVersion == "" {
		panic("BUG: couldn't find current data directory version")
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d, 0700); err != nil {
			return "", fmt.Errorf("failed to create dir %s: %w", d, err)
		}
	}

	db, err := OpenSQLite(d.SQLitePath(), 0, 1)
	if err != nil {
		return "", err
	}
	defer db.Close()

	if err := InitSQLiteSchema(db); err != nil {
		return "", fmt.Errorf("failed to initialize SQLite database: %w", err)
	}

	if d.device.Wrapped() == nil {
		kp, err := core.NewKeyPairRandom()
		if err != nil {
			return "", fmt.Errorf("failed to generate random device key: %w", err)
		}
		d.device = kp
	}

	if err := writeDeviceKeyFile(d.path, d.device.Wrapped()); err != nil {
		return "", err
	}

	if err := writeVersionFile(d.path, currentVersion); err != nil {
		return "", fmt.Errorf("failed to write version file to init data directory: %w", err)
	}

	return currentVersion, nil
}

func (d *Dir) migrate(currentVersion string) error {
	desiredVersion := migrations[len(migrations)-1].Version
	if currentVersion > desiredVersion {
		return fmt.Errorf("OLD VERSION: you are running an old version of Mintter: your data dir version is %q and it can't be downgraded to %q", currentVersion, desiredVersion)
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
			return fmt.Errorf("BREAKING CHANGE: this version of Mintter is incompatible with your existing data: remove your data directory located in %q", d.path)
		}

		pending := migrations[idx+1:]
		if len(pending) > 0 {
			db, err := OpenSQLite(d.SQLitePath(), 0, 1)
			if err != nil {
				return err
			}
			defer db.Close()

			conn, release, err := db.Conn(context.Background())
			if err != nil {
				return err
			}
			defer release()

			for _, mig := range pending {
				// In case of a problem (e.g. power cut) we could end up with an applied migration,
				// but without the version file being written, in which case things will be bad.
				// To reduce this risk to some extent, we write the version file after each migration.
				//
				// TODO(burdiyan): maybe move the version information into the database so everything could be done atomically,
				// or implement some sort of recovery mechanism for these situations.

				if err := sqlitex.WithTx(conn, func() error {
					return mig.Run(d, conn)
				}); err != nil {
					return fmt.Errorf("failed to run migration %s: %w", mig.Version, err)
				}

				if err := writeVersionFile(d.path, mig.Version); err != nil {
					return fmt.Errorf("failed to write version file: %w", err)
				}
			}
		}
	}

	// Preparing the device key.
	{
		kp, err := loadDeviceKeyFromFile(d.path)
		if err != nil {
			return fmt.Errorf("failed to load device key from file: %w", err)
		}

		if d.device.Wrapped() != nil {
			if !d.device.Wrapped().Equals(kp.Wrapped()) {
				return fmt.Errorf("device key loaded from file doesn't match the desired key")
			}
		} else {
			d.device = kp
		}
	}

	if err := d.maybeLoadAccountKey(); err != nil {
		return fmt.Errorf("failed to load account key: %w", err)
	}

	return nil
}

func (d *Dir) maybeLoadAccountKey() error {
	data, err := os.ReadFile(filepath.Join(d.path, accountKeyPath))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	pub, err := crypto.UnmarshalPublicKey(data)
	if err != nil {
		return err
	}

	account, err := core.NewPublicKey(pub)
	if err != nil {
		return err
	}

	return d.me.Resolve(core.NewIdentity(account, d.device))
}

// CommitAccount writes the account key to the disk and loads it into the storage.
func (d *Dir) CommitAccount(acc core.PublicKey) error {
	if _, ok := d.me.Get(); ok {
		return fmt.Errorf("account is already initialized")
	}

	if err := writeAccountKeyFile(d.path, acc); err != nil {
		return fmt.Errorf("failed to write account key file: %w", err)
	}

	if err := d.maybeLoadAccountKey(); err != nil {
		return fmt.Errorf("failed to load account key file after writing: %w", err)
	}

	if _, ok := d.me.Get(); !ok {
		return fmt.Errorf("BUG: failed to resolve account key after writing")
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

func writeAccountKeyFile(dir string, pub core.PublicKey) error {
	data, err := crypto.MarshalPublicKey(pub.Wrapped())
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(dir, accountKeyPath), data, 0600)
}

func loadDeviceKeyFromFile(dir string) (kp core.KeyPair, err error) {
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
