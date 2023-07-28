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
// Care has to be taken when migrations are being added in master, and feature branches in parallel.
//
// It's important to backup your data directory when trying out the code from a feature branch that has a migration.
// Otherwise when you switch back to the main branch the program will complain about an unknown version of the data directory.
var migrations = []migration{
	// The pre-migration version does nothing.
	// It's here to find the starting point.
	{Version: "2023-06-26.01", Run: func(*Dir, *sqlite.Conn) error {
		return nil
	}},

	// Clear the user_version pragma which we used to use before migration framework was implemented.
	{Version: "2023-07-12.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, "PRAGMA user_version = 0;")
	}},

	// Replace tabs to spaces in the SQL schema text, to make it compatible with the new schema file.
	{Version: "2023-07-24.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, `
			PRAGMA writable_schema = ON;
			UPDATE sqlite_schema SET sql = replace(sql, '	', '    ');
			PRAGMA writable_schema = OFF;
		`)
	}},

	// Remove foreign key from web_publications to hd_entities, to avoid losing data when reindexing.
	{Version: "2023-07-25.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		if err := sqlitex.ExecScript(conn, sqlfmt(`
			ALTER TABLE web_publications RENAME TO old_web_publications;

			CREATE TABLE web_publications (
				eid TEXT PRIMARY KEY CHECK (eid != ''),
				version TEXT NOT NULL,
				path TEXT UNIQUE
			);

			INSERT INTO web_publications (eid, version, path)
			SELECT hd_entities.eid, old_web_publications.version, old_web_publications.path
			FROM old_web_publications
			INNER JOIN hd_entities ON hd_entities.id = old_web_publications.document;

			DROP TABLE old_web_publications;

			PRAGMA foreign_key_check;
			`)); err != nil {
			return err
		}

		// Committing the transaction started by the migration framework.
		if err := sqlitex.ExecTransient(conn, "COMMIT", nil); err != nil {
			return err
		}

		// Running VACUUM to defragment the database.
		if err := sqlitex.ExecTransient(conn, "VACUUM", nil); err != nil {
			return err
		}

		// Starting a new transaction because migration framework will always want to COMMIT.
		return sqlitex.ExecTransient(conn, "BEGIN", nil)
	}},

	// Adding a trusted table to store the accounts we trust.
	{Version: "2023-07-26.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			CREATE TABLE IF NOT EXISTS trusted_accounts (
				id INTEGER PRIMARY KEY REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL
			) WITHOUT ROWID;
			INSERT INTO trusted_accounts (id) VALUES (1);
		`))
	}},

	// Index the author of each change.
	{Version: "2023-07-27.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE hd_changes;
			CREATE TABLE hd_changes (
				entity INTEGER REFERENCES hd_entities (id) NOT NULL,
				blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
				hlc_time INTEGER NOT NULL,
				author INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
				PRIMARY KEY (entity, blob)
			) WITHOUT ROWID;
			CREATE INDEX idx_hd_changes_to_entity ON hd_changes (blob, entity);
			CREATE INDEX idx_key_delegations_by_blob ON key_delegations (blob, issuer, delegate);
			DELETE FROM global_meta WHERE key = 'last_reindex_time';
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
		kp, err := core.NewKeyPairRandom(core.CodecDeviceKey)
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
		return fmt.Errorf("current version '%s' is newer than the desired version '%s': you are probably running old version of the software", currentVersion, desiredVersion)
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
			return fmt.Errorf("failed to find migration for version '%s'", currentVersion)
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

	account, err := core.NewPublicKey(core.CodecAccountKey, pub)
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

	return core.NewKeyPair(core.CodecDeviceKey, pk)
}
