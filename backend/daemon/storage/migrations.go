package storage

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"seed/backend/core"
	"strconv"

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
│  ├─ seed_id_ed25519.pub
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
	{Version: "2023-11-17.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		oldResources := mustCount(conn, "lookup WHERE type = unicode('r')")
		oldPublicKeys := mustCount(conn, "lookup WHERE type = unicode('p')")
		oldTrustedAccounts := mustCount(conn, "trusted_accounts")
		oldDrafts := mustCount(conn, "drafts")

		err := sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE accounts;
			DROP TABLE blob_attrs;
			DROP TABLE heads;
			DROP VIEW key_delegations;
			DROP VIEW key_delegations_view;
			DROP VIEW change_deps;

			DROP VIEW public_keys;
			CREATE TABLE public_keys (
				id INTEGER PRIMARY KEY,
				principal BLOB UNIQUE NOT NULL
			);
			
			INSERT INTO public_keys (id, principal)
			SELECT id, value FROM lookup WHERE type = unicode('p');

			CREATE TABLE structural_blobs (
				id INTEGER PRIMARY KEY REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
				type TEXT NOT NULL,
				ts INTEGER,
				author INTEGER REFERENCES public_keys (id),
				resource INTEGER REFERENCES resources (id)
			) WITHOUT ROWID;
			CREATE INDEX structural_blobs_by_author ON structural_blobs (author) WHERE author IS NOT NULL;
			CREATE INDEX structural_blobs_by_resource ON structural_blobs (resource) WHERE resource IS NOT NULL;

			CREATE TABLE key_delegations (
				id INTEGER PRIMARY KEY REFERENCES blobs (id) NOT NULL,
				issuer INTEGER REFERENCES public_keys (id),
				delegate INTEGER REFERENCES public_keys (id)
			) WITHOUT ROWID;
			CREATE INDEX key_delegations_by_issuer ON key_delegations (issuer, delegate);
			CREATE INDEX key_delegations_by_delegate ON key_delegations (delegate, issuer);

			CREATE TABLE resources (
				id INTEGER PRIMARY KEY,
				iri TEXT UNIQUE NOT NULL,
				owner INTEGER REFERENCES public_keys (id),
				create_time INTEGER
			);
			CREATE INDEX resources_by_owner ON resources (owner) WHERE owner IS NOT NULL;
			INSERT INTO resources (iri) SELECT value FROM lookup WHERE type = unicode('r');

			DROP TABLE blob_links;
			CREATE TABLE blob_links (
				source INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
				target INTEGER REFERENCES blobs (id) NOT NULL,
				type TEXT NOT NULL,
				PRIMARY KEY (source, target, type)
			) WITHOUT ROWID;
			CREATE UNIQUE INDEX blob_backlinks ON blob_links (target, source, type);

			CREATE TABLE resource_links (
				source INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
				target INTEGER REFERENCES resources (id) NOT NULL,
				type TEXT NOT NULL,
				is_pinned INTEGER NOT NULL DEFAULT (0),
				meta BLOB
			);
			CREATE INDEX resource_links_by_source ON resource_links (source, is_pinned, target);
			CREATE INDEX resource_links_by_target ON resource_links (target);

			ALTER TABLE trusted_accounts RENAME TO trusted_accounts_old;

			CREATE TABLE trusted_accounts (
				id INTEGER PRIMARY KEY REFERENCES public_keys (id) NOT NULL
			) WITHOUT ROWID;

			INSERT INTO trusted_accounts (id)
			SELECT id FROM public_keys
			WHERE principal IN (
				SELECT value FROM lookup
				JOIN trusted_accounts_old ON trusted_accounts_old.id = lookup.id
			);

			DROP TABLE trusted_accounts_old;
			DROP TABLE changes;
			DROP VIEW changes_view;

			CREATE VIEW change_deps AS
			SELECT
				source AS child,
				target AS parent
			FROM blob_links
			WHERE type = 'change/dep';

			DROP VIEW drafts_view;
			DROP INDEX drafts_by_blob;
			DROP INDEX drafts_unique;
			ALTER TABLE drafts RENAME TO drafts_old;
			CREATE TABLE drafts (
				resource INTEGER REFERENCES resources (id) NOT NULL,
				blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
				PRIMARY KEY (resource, blob)
			) WITHOUT ROWID;
			CREATE INDEX drafts_by_blob ON drafts (blob);
			CREATE UNIQUE INDEX drafts_unique ON drafts (resource);
			INSERT INTO drafts (resource, blob)
			SELECT resources.id, drafts_old.blob
			FROM drafts_old
			JOIN lookup ON lookup.id = drafts_old.entity
			JOIN resources ON resources.iri = lookup.value;
			DROP TABLE drafts_old;
			
			CREATE VIEW drafts_view AS
			SELECT
				drafts.resource AS resource_id,
				drafts.blob AS blob_id,
				resources.iri AS resource,
				blobs.codec AS codec,
				blobs.multihash AS multihash
			FROM drafts
			JOIN resources ON resources.id = drafts.resource
			JOIN blobs ON blobs.id = drafts.blob;
			
			DROP VIEW entities;
			DROP TABLE lookup;

			CREATE VIEW key_delegations_view AS
			SELECT
				kd.id AS blob,
				blobs.codec AS blob_codec,
				blobs.multihash AS blob_multihash,
				iss.principal AS issuer,
				del.principal AS delegate
			FROM key_delegations kd
			JOIN blobs ON blobs.id = kd.id
			JOIN public_keys iss ON iss.id = kd.issuer
			JOIN public_keys del ON del.id = kd.delegate;

			CREATE VIEW structural_blobs_view AS
			SELECT
				structural_blobs.type AS blob_type,
				structural_blobs.id AS blob_id,
				structural_blobs.resource AS resource_id,
				structural_blobs.ts AS ts,
				resources.iri AS resource,
				blobs.codec AS codec,
				blobs.multihash AS multihash,
				blobs.data AS data,
				blobs.size AS size
			FROM structural_blobs
			JOIN blobs ON blobs.id = structural_blobs.id
			JOIN resources ON structural_blobs.resource = resources.id;

			DELETE FROM kv WHERE key = 'last_reindex_time';
		`))
		if err != nil {
			return err
		}

		newResources := mustCount(conn, "resources")
		newPublicKeys := mustCount(conn, "public_keys")
		newTrustedAccounts := mustCount(conn, "trusted_accounts")
		newDrafts := mustCount(conn, "drafts")

		if oldResources != newResources {
			return fmt.Errorf("resources count mismatch: %d != %d", oldResources, newResources)
		}

		if oldPublicKeys != newPublicKeys {
			return fmt.Errorf("public keys count mismatch: %d != %d", oldPublicKeys, newPublicKeys)
		}

		if oldTrustedAccounts != newTrustedAccounts {
			return fmt.Errorf("trusted accounts count mismatch: %d != %d", oldTrustedAccounts, newTrustedAccounts)
		}

		if oldDrafts != newDrafts {
			return fmt.Errorf("drafts count mismatch: %d != %d", oldDrafts, newDrafts)
		}

		return nil
	}},
	{Version: "2023-11-30.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE IF EXISTS blob_links;
			DROP INDEX IF EXISTS blob_backlinks;
			CREATE TABLE IF NOT EXISTS blob_links (
				source INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
				target INTEGER REFERENCES blobs (id) NOT NULL,
				type TEXT NOT NULL,
				PRIMARY KEY (source, type, target)
			) WITHOUT ROWID;
			CREATE UNIQUE INDEX IF NOT EXISTS blob_backlinks ON blob_links (target, type, source);
			
			DROP INDEX IF EXISTS structural_blobs_by_author;
			DROP INDEX IF EXISTS structural_blobs_by_resource;
			CREATE INDEX IF NOT EXISTS structural_blobs_by_author ON structural_blobs (author, resource) WHERE author IS NOT NULL;
			CREATE INDEX IF NOT EXISTS structural_blobs_by_resource ON structural_blobs (resource, author) WHERE resource IS NOT NULL;
			
			DELETE FROM kv WHERE key = 'last_reindex_time';
		`))
	}},
	{Version: "2024-01-22.01", Run: func(d *Dir, conn *sqlite.Conn) error {
		if err := sqlitex.ExecScript(conn, sqlfmt(`
			CREATE TABLE IF NOT EXISTS syncing_cursors (
				peer INTEGER PRIMARY KEY REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
				cursor TEXT NOT NULL
			) WITHOUT ROWID;
			COMMIT;
		`)); err != nil {
			return err
		}

		if err := sqlitex.ExecTransient(conn, "BEGIN IMMEDIATE", nil); err != nil {
			return err
		}

		var schemaVersion int
		if err := sqlitex.ExecTransient(conn, "PRAGMA schema_version", func(stmt *sqlite.Stmt) error {
			schemaVersion = stmt.ColumnInt(0)
			return nil
		}); err != nil {
			return err
		}

		return sqlitex.ExecScript(conn, sqlfmt(`
			PRAGMA writable_schema = ON;

			UPDATE sqlite_schema
			SET sql = 'CREATE TABLE structural_blobs (
				id INTEGER PRIMARY KEY REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
				type TEXT NOT NULL,
				ts INTEGER,
				author INTEGER REFERENCES public_keys (id),
				resource INTEGER REFERENCES resources (id)
			) WITHOUT ROWID'
			WHERE type = 'table'
			AND name = 'structural_blobs';
			
			UPDATE sqlite_schema
			SET sql = 'CREATE TABLE key_delegations (
				id INTEGER PRIMARY KEY REFERENCES blobs (id) ON UPDATE CASCADE NOT NULL,
				issuer INTEGER REFERENCES public_keys (id),
				delegate INTEGER REFERENCES public_keys (id)
			) WITHOUT ROWID'
			WHERE type = 'table'
			AND name = 'key_delegations';

			UPDATE sqlite_schema
			SET sql = 'CREATE TABLE blob_links (
				source INTEGER REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
				target INTEGER REFERENCES blobs (id) ON UPDATE CASCADE NOT NULL,
				type TEXT NOT NULL,
				PRIMARY KEY (source, type, target)
			) WITHOUT ROWID'
			WHERE type = 'table'
			AND name = 'blob_links';

			UPDATE sqlite_schema
			SET sql = 'CREATE TABLE resource_links (
				source INTEGER REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
				target INTEGER REFERENCES resources (id) NOT NULL,
				type TEXT NOT NULL,
				is_pinned INTEGER NOT NULL DEFAULT (0),
				meta BLOB
			)'
			WHERE type = 'table'
			AND name = 'resource_links';

			PRAGMA schema_version = `+strconv.Itoa(schemaVersion+1)+`;
			PRAGMA writable_schema = OFF;
			PRAGMA integrity_check;
		`))
	}},
	{Version: "2024-02-23.01", Run: func(_ *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE IF EXISTS structural_blobs;
			DROP INDEX IF EXISTS structural_blobs_by_author;
			DROP INDEX IF EXISTS structural_blobs_by_resource;
			DROP INDEX IF EXISTS structural_blobs_by_ts;
			CREATE TABLE structural_blobs (
				id INTEGER PRIMARY KEY REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
				type TEXT NOT NULL,
				ts INTEGER,
				author INTEGER REFERENCES public_keys (id),
				resource INTEGER REFERENCES resources (id),
				meta TEXT
			) WITHOUT ROWID;
			CREATE INDEX structural_blobs_by_author ON structural_blobs (author, resource) WHERE author IS NOT NULL;
			CREATE INDEX structural_blobs_by_resource ON structural_blobs (resource, author) WHERE resource IS NOT NULL;
			CREATE INDEX structural_blobs_by_ts ON structural_blobs(ts, resource) WHERE ts IS NOT NULL;
			DELETE FROM kv WHERE key = 'last_reindex_time';
		`))
	}},
	{Version: "2024-03-01.03", Run: func(_ *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			CREATE INDEX blobs_metadata ON blobs (id, multihash, codec, size, insert_time);
			CREATE INDEX blobs_metadata_by_hash ON blobs (multihash, codec, size, insert_time);
		`))
	}},
	{Version: "2024-03-18.01", Run: func(_ *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE IF EXISTS resource_links;

			CREATE TABLE resource_links (
				id INTEGER PRIMARY KEY,
				source INTEGER REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
				target INTEGER REFERENCES resources (id) NOT NULL,
				type TEXT NOT NULL,
				is_pinned INTEGER NOT NULL DEFAULT (0),
				meta BLOB
			);
			CREATE INDEX resource_links_by_source ON resource_links (source, is_pinned, target);
			CREATE INDEX resource_links_by_target ON resource_links (target, source);

			DELETE FROM kv WHERE key = 'last_reindex_time';
		`))
	}},
	{Version: "2024-03-19.01", Run: func(_ *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP VIEW IF EXISTS key_delegations_view;
			CREATE VIEW IF NOT EXISTS key_delegations_view AS
			SELECT
				kd.id AS blob,
				blobs.codec AS blob_codec,
				blobs.multihash AS blob_multihash,
				iss.principal AS issuer,
				del.principal AS delegate
			FROM key_delegations kd
			JOIN blobs INDEXED BY blobs_metadata ON blobs.id = kd.id
			JOIN public_keys iss ON iss.id = kd.issuer
			JOIN public_keys del ON del.id = kd.delegate;

			DROP VIEW IF EXISTS drafts_view;
			CREATE VIEW IF NOT EXISTS drafts_view AS
			SELECT
				drafts.resource AS resource_id,
				drafts.blob AS blob_id,
				resources.iri AS resource,
				blobs.codec AS codec,
				blobs.multihash AS multihash
			FROM drafts
			JOIN resources ON resources.id = drafts.resource
			JOIN blobs INDEXED BY blobs_metadata ON blobs.id = drafts.blob;
		`))
	}},
	{Version: "2024-03-25.01", Run: func(_ *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP VIEW IF EXISTS meta_view;
			CREATE VIEW if not exists meta_view AS
			WITH RankedBlobs AS (
				SELECT 
					sb.id, 
					sb.meta, 
					sb.author, 
					sb.resource, 
					sb.ts, 
					ROW_NUMBER() OVER (
						PARTITION BY sb.resource 
						ORDER BY 
							(CASE WHEN sb.meta IS NOT NULL THEN 0 ELSE 1 END), 
							sb.ts DESC
					) AS rank
				FROM structural_blobs sb
				WHERE sb.type = 'Change'
			),
			LatestBlobs AS (
				SELECT 
					rb.id,
					rb.meta, 
					rb.author, 
					rb.resource, 
					rb.ts
				FROM RankedBlobs rb
				WHERE rb.rank = 1
			)
			SELECT 
				lb.meta, 
				res.iri, 
				pk.principal
			FROM LatestBlobs lb
			JOIN resources res ON res.id = lb.resource
			JOIN public_keys pk ON pk.id = lb.author;
		`))
	}},
	{Version: "2024-04-08.01", Run: func(_ *Dir, conn *sqlite.Conn) error {
		return sqlitex.ExecScript(conn, sqlfmt(`
			DROP TABLE IF EXISTS deleted_resources;

			CREATE TABLE IF NOT EXISTS deleted_resources (
				iri TEXT PRIMARY KEY,
				delete_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
				reason TEXT,
				meta TEXT
			);
		`))
	}},
}

const (
	keysDir = "keys"
	dbDir   = "db"

	devicePrivateKeyPath = keysDir + "/libp2p_id_ed25519"
	accountKeyPath       = keysDir + "/seed_id_ed25519.pub"

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
			return fmt.Errorf("BREAKING CHANGE: this version of Seed is incompatible with your existing data: remove your data directory located in %q", d.path)
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

func mustCount(conn *sqlite.Conn, table string) (count int) {
	count = -1
	err := sqlitex.Exec(conn, "SELECT COUNT() FROM "+table, func(stmt *sqlite.Stmt) error {
		count = stmt.ColumnInt(0)
		return nil
	})
	if err != nil {
		panic(err)
	}

	if count == -1 {
		panic("BUG: must have count")
	}

	return count
}
