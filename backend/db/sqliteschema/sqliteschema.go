// Package sqliteschema defines the Mintter-specific schema for SQLite
// and provides utilities for executing schema migration.
package sqliteschema

import (
	"context"
	"fmt"
	"mintter/backend/db/sqlitegen"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/multierr"
)

func init() {
	sqlitegen.AddInitialism(
		"IPFS",
		"CID",
	)
}

// The list with a global set of database migrations.
// Append-only! DO NOT REMOVE, EDIT, OR REORDER PREVIOUS ENTRIES.
// Do not add statements to existing migration scripts, append new ones instead.
//
// We store timestamps as INTEGER SQLite types, so use `strftime('%s', 'now')` as a default value if needed.
//
// IMPORTANT: after modifying migrations run go generate in this package, or do it from
// your editor if it supports it. There should be something like "run go generate" button bellow.
//
//go:generate gorun -tags codegen generateSchema
var migrations = []string{
	`-- Stores the content of IPFS blobs.
		CREATE TABLE ipfs_blocks (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Original multihash of the IPFS blob.
			-- We don't store CIDs, this is what most blockstore
			-- implementations are doing.
			-- We don't want to store the content more than once,
			-- so UNIQUE constraint is needed here.
			-- We don't use multihash as a primary key to reduce the database size,
			-- as there're multiple other tables referencing records from this table.
			multihash BLOB NOT NULL,
			-- Multicodec describing the data stored in the block.
			codec INTEGER NOT NULL,
			-- Actual content of the block.
			data BLOB NOT NULL,
			-- Subjective (locally perceived) time when this block was fetched for the first time.
			-- Not sure if actually useful, but might become at some point.
			create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
			UNIQUE (multihash, codec)
		);

		-- Stores data about Mintter Accounts.
		CREATE TABLE accounts (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Multihash part of the Account ID.
			multihash BLOB UNIQUE NOT NULL,
			-- Codec part of the Account ID.
			codec INTEGER NOT NULL,
			-- Currently known value for the profile alias.
			alias TEXT,
			-- Currently known value for the profile bio.
			bio TEXT,
			-- Currently known value for the profile email.
			email TEXT
		);

		-- Stores data about Mintter Devices.
		CREATE TABLE devices (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Multihash part of the Device ID.
			multihash BLOB UNIQUE NOT NULL,
			-- Codec part of the Device ID.
			codec INTEGER NOT NULL,
			-- Bytes of the public key.
			-- Mostly NULL because Ed25519 keys can be extracted from the CID.
			public_key BLOB DEFAULT NULL,
			-- Reference to the Account this Device belongs to.
			account_id INTEGER REFERENCES accounts NOT NULL,
			-- Subjective (locally perceived) time when the item was created.
			create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
		);

		CREATE INDEX idx_devices_by_account ON devices (account_id);

		-- Stores data about Mintter Objects.
		CREATE TABLE objects (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Multihash part of the Object ID.
			multihash BLOB NOT NULL,
			-- Codec part of the Object ID.
			codec INTEGER NOT NULL,
			-- Reference to the Account that created the Object.
			account_id INTEGER REFERENCES accounts NOT NULL,
			-- Subjective (locally perceived) time when the item was created.
			create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
			UNIQUE (multihash, codec)
		);

		-- Temporary table prior to refactor.
		CREATE TABLE heads (
			object_id INTEGER REFERENCES objects ON DELETE CASCADE NOT NULL,
			device_id INTEGER REFERENCES devices ON DELETE CASCADE NOT NULL,
			seq INTEGER CHECK (seq > 0) NOT NULL,
			lamport_time INTEGER CHECK (lamport_time > 0) NOT NULL,
			ipfs_block_id INTEGER REFERENCES ipfs_blocks NOT NULL,
			PRIMARY KEY (object_id, device_id)
		);

		-- Stores changes for objects.
		CREATE TABLE changes (
			-- Alias to the rowid for simpler indexing.
			id INTEGER PRIMARY KEY,
			-- Reference to the Object being changed.
			object_id INTEGER REFERENCES objects ON DELETE CASCADE NOT NULL,
			-- Reference to the Device that signed the Change.
			device_id INTEGER REFERENCES devices NOT NULL,
			-- Sequence number from the Change.
			seq INTEGER CHECK (seq > 0),
			-- Lamport timestamp of the Change.
			lamport_time INTEGER CHECK (lamport_time > 0),
			-- Reference to the IPFS Blob with contents of the Change.
			ipfs_block_id INTEGER REFERENCES ipfs_blocks NOT NULL,
			-- Composite key that uniquely identifies a Change.
			UNIQUE (object_id, device_id, seq)
		);

		-- Stores draft-related attributes of an Object.
		CREATE TABLE drafts (
			id INTEGER PRIMARY KEY,
			title TEXT NOT NULL,
			subtitle TEXT NOT NULL,
			content BLOB,
			create_time INTEGER NOT NULL CHECK (create_time > 500),
			update_time INTEGER NOT NULL CHECK (update_time > 500),
			FOREIGN KEY (id) REFERENCES objects ON DELETE CASCADE
		);

		-- Stores publication-related attributes of an Object.
		CREATE TABLE publications (
			id INTEGER PRIMARY KEY,
			title TEXT NOT NULL,
			subtitle TEXT NOT NULL,
			create_time INTEGER NOT NULL CHECK (create_time > 500),
			update_time INTEGER NOT NULL CHECK (update_time > 500),
			publish_time INTEGER NOT NULL CHECK (publish_time > 500),
			latest_version TEXT NOT NULL,
			FOREIGN KEY (id) REFERENCES objects ON DELETE CASCADE
		);

		-- Index for links from Documents.
		CREATE TABLE links (
			-- Reference to Document ID from which link originates.
			source_document_id INTEGER REFERENCES objects ON DELETE CASCADE NOT NULL,
			-- Block ID inside the Document which contains the link.
			source_block_id TEXT NOT NULL,
			-- Reference to Document ID that is linked.
			target_document_id INTEGER REFERENCES objects ON DELETE CASCADE NOT NULL,
			-- Block ID that is linked. Can be NULL if links is to the whole Document.
			target_block_id TEXT,
			-- Version of the target Document that is linked.
			target_document_version TEXT NOT NULL,
			-- Reference to Change that created a link.
			-- Since each Change references all the dependant changes
			-- the ID of the Change is guaranteed to be a valid Version
			-- to identify the state of the source Document.
			source_change INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE,
			-- Reference to the draft if the link is in the draft.
			source_draft INTEGER REFERENCES drafts ON DELETE CASCADE,
			-- Only allow one of the two columns to be set.
			CHECK ((source_change IS NULL AND source_draft IS NOT NULL) OR (source_change IS NOT NULL AND source_draft IS NULL))
		);

		-- Index to query links on drafts.
		CREATE INDEX idx_links_source_draft ON links (source_draft)
		WHERE source_draft IS NOT NULL;

		-- Index for backlinks.
		CREATE INDEX idx_links_target_document_id ON links (target_document_id);

		-- Virtual table for backlinks.
		CREATE VIRTUAL TABLE backlinks USING transitive_closure (
			tablename = 'links',
			-- We need to treat target documents as parents
			-- for transitive closure to inclide the source documents.
			idcolumn = 'source_document_id',
			parentcolumn = 'target_document_id'
		);
	`,
}

// Open a connection pool for SQLite, enabling some needed functionality for our schema
// like foreign keys.
func Open(uri string, flags sqlite.OpenFlags, poolSize int) (*sqlitex.Pool, error) {
	pool, err := sqlitex.Open(uri, flags, poolSize)
	if err != nil {
		return nil, err
	}

	prelude := []string{
		"PRAGMA foreign_keys = ON;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA journal_mode = WAL;",
	}

	if err := pool.ForEach(func(conn *sqlite.Conn) error {
		for _, stmt := range prelude {
			if err := sqlitex.ExecTransient(conn, stmt, nil); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return pool, nil
}

// Migrate the database applying migrations defined in this package.
// migration is done in a transaction.
func Migrate(conn *sqlite.Conn) error {
	return migrate(conn, migrations)
}

// MigratePool is like Migrate but accepts a pool instead of a conn.
// Often it's more convenient.
func MigratePool(ctx context.Context, pool *sqlitex.Pool) error {
	conn, release, err := pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return Migrate(conn)
}

func migrate(conn *sqlite.Conn, migrations []string) error {
	v, err := getUserVersion(conn)
	if err != nil {
		return err
	}

	if v == len(migrations) {
		return nil
	}

	if v > len(migrations) {
		return fmt.Errorf("refusing to migrate down from version %d to %d", v, len(migrations))
	}

	return withTx(conn, func(conn *sqlite.Conn) error {
		for _, script := range migrations[v:] {
			if err := sqlitex.ExecScript(conn, script); err != nil {
				return err
			}
		}

		return setUserVersion(conn, len(migrations))
	})
}

func withTx(conn *sqlite.Conn, fn func(conn *sqlite.Conn) error) (err error) {
	if err := sqlitex.ExecTransient(conn, "BEGIN TRANSACTION;", nil); err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err == nil {
			err = sqlitex.ExecTransient(conn, "COMMIT;", nil)
		} else {
			err = multierr.Append(err, sqlitex.ExecTransient(conn, "ROLLBACK;", nil))
		}
	}()

	if err := fn(conn); err != nil {
		return err
	}

	return nil
}

func getUserVersion(conn *sqlite.Conn) (int, error) {
	var v int
	err := sqlitex.ExecTransient(conn, "PRAGMA user_version;", func(stmt *sqlite.Stmt) error {
		v = stmt.ColumnInt(0)
		return nil
	})
	return v, err
}

func setUserVersion(conn *sqlite.Conn, v int) error {
	return sqlitex.ExecTransient(conn, fmt.Sprintf("PRAGMA user_version = %d;", v), nil)
}
