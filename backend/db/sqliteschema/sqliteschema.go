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
	`
-- Stores the content of IPFS blobs.
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
		UNIQUE (multihash)
	);

	-- Stores data about Mintter Accounts.
	CREATE TABLE accounts (
		-- Short numerical ID to be used internally.
		id INTEGER PRIMARY KEY,
		-- Multihash part of the Account ID.
		multihash BLOB UNIQUE NOT NULL,
		-- Subjective (locally perceived) time when the item was created.
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);
	
	-- Stores profile information.
	CREATE TABLE profiles (
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL,
		alias TEXT,
		email TEXT,
		bio TEXT,
		change_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (account_id, change_id),
		CHECK (account_id != change_id)
	) WITHOUT ROWID;

	-- Stores data about Mintter Devices.
	CREATE TABLE devices (
		-- Short numerical ID to be used internally.
		id INTEGER PRIMARY KEY,
		-- Multihash part of the Device ID.
		multihash BLOB UNIQUE NOT NULL,
		-- Bytes of the public key.
		-- Mostly NULL because Ed25519 keys can be extracted from the CID.
		public_key BLOB DEFAULT NULL,
		-- Subjective (locally perceived) time when the item was created.
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);

	-- Stores relationships between accounts and devices.
	CREATE TABLE account_devices (
		account_id INTEGER REFERENCES accounts NOT NULL,
		device_id INTEGER REFERENCES devices NOT NULL,
		change_id INTEGER REFERENCES ipfs_blocks NOT NULL,
		PRIMARY KEY (account_id, device_id)
	) WITHOUT ROWID;

	-- Helps to query accounts of a device.
	CREATE INDEX idx_device_accounts ON account_devices (device_id, account_id);
	
	-- Stores references to the IPFS blocks that are Mintter Permanodes.
	CREATE TABLE permanodes (
		id INTEGER PRIMARY KEY,
		type TEXT NOT NULL CHECK (type != ''),
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
		FOREIGN KEY (id) REFERENCES ipfs_blocks ON DELETE CASCADE
	);

	-- Help to query permanodes by type.
	CREATE INDEX idx_permanodes_by_type ON permanodes (type);
	
	-- Stores owners of the Mintter Permanode objects.
	CREATE TABLE permanode_owners (
		account_id INTEGER REFERENCES accounts NOT NULL,
		permanode_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (account_id, permanode_id)
	) WITHOUT ROWID;

	-- Helps to query by owners of a permanode.
	CREATE INDEX idx_permanode_owners_by_permanode ON permanode_owners (permanode_id, account_id);

	CREATE TABLE changes (
		id INTEGER PRIMARY KEY,
		permanode_id INTEGER REFERENCES permanodes ON DELETE CASCADE NOT NULL,
		kind TEXT,
		lamport_time INTEGER NOT NULL,
		create_time INTEGER NOT NULL,
		FOREIGN KEY (id) REFERENCES ipfs_blocks ON DELETE CASCADE
	);

	CREATE TABLE change_authors (
		change_id INTEGER REFERENCES changes ON DELETE CASCADE NOT NULL,
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (change_id, account_id)
	) WITHOUT ROWID;
	
	CREATE TABLE named_versions (
		object_id INTEGER REFERENCES permanodes ON DELETE CASCADE NOT NULL,
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL,
		device_id INTEGER REFERENCES devices ON DELETE CASCADE NOT NULL,
		name TEXT NOT NULL,
		version TEXT NOT NULL,
		PRIMARY KEY (object_id, account_id, device_id, name)
	) WITHOUT ROWID;

	CREATE TABLE working_copy (
		object_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		name TEXT NOT NULL,
		data BLOB,
		version TEXT DEFAULT ('') NOT NULL,
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
		update_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
		PRIMARY KEY (object_id, name)
	) WITHOUT ROWID;

	-- Stores draft-related attributes of an Object.
	CREATE TABLE drafts (
		id INTEGER PRIMARY KEY,
		title TEXT NOT NULL,
		subtitle TEXT NOT NULL,
		content BLOB,
		create_time INTEGER NOT NULL CHECK (create_time > 500),
		update_time INTEGER NOT NULL CHECK (update_time > 500),
		FOREIGN KEY (id) REFERENCES ipfs_blocks ON DELETE CASCADE
	);

	-- Stores document-related indexed attributes
	CREATE TABLE documents (
		id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		title TEXT NOT NULL,
		subtitle TEXT NOT NULL,
		change_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (id, change_id),
		CHECK(id != change_id)
	) WITHOUT ROWID;

	-- Index for links from Documents.
	CREATE TABLE links (
		-- Alias to the rowid so we can delete links efficiently.
		id INTEGER PRIMARY KEY,
		-- Reference to Document ID from which link originates.
		source_object_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		-- Block ID inside the Document which contains the link.
		source_block_id TEXT NOT NULL CHECK (source_block_id != ''),
		-- Reference to the IPFS block of the change that introduced the link.
		-- Only required for publications. Otherwise the link is from the current draft.
		source_ipfs_block_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE,
		-- Reference to Document ID that is linked.
		target_object_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		-- Block ID that is linked. Can be NULL if links is to the whole Document.
		target_block_id TEXT NOT NULL DEFAULT '',
		-- Version of the target Document that is linked.
		target_version TEXT NOT NULL CHECK (target_version != ''),
		UNIQUE (source_object_id, source_block_id, target_object_id, target_block_id, target_version)
	);

	-- Trigger to delete links when drafts are deleted.
	CREATE TRIGGER trg_drafts_delete_links AFTER DELETE ON drafts
	BEGIN
		DELETE FROM links
		WHERE source_object_id = old.id
		AND source_ipfs_block_id IS NULL;
	END;

	-- Index to request outgoing links by source object ID.
	CREATE INDEX idx_links_source_object_id ON links (source_object_id);

	-- Index for backlinks.
	CREATE INDEX idx_links_target_object_id ON links (target_object_id);

	-- Virtual table for backlinks.
	CREATE VIRTUAL TABLE backlinks USING transitive_closure (
		tablename = 'links',
		-- We need to treat target documents as parents
		-- for transitive closure to inclide the source documents.
		idcolumn = 'source_object_id',
		parentcolumn = 'target_object_id'
	);

	-- Stores Lightning wallets both externals (imported wallets like bluewallet
	-- based on lndhub) and internals (based on the LND embedded node).
	CREATE TABLE wallets (
		-- Wallet unique ID. Is the url hash in case of lndhub or the pubkey in case of LND.
		id TEXT PRIMARY KEY,
		-- Address of the LND node backing up this wallet. In case lndhub, this will be the 
		-- URL to connect via rest api. In case LND wallet, this will be the clearnet/onion address.
		address TEXT NOT NULL,
		-- The type of the wallet. Either lnd or lndhub
		type TEXT CHECK( type IN ('lnd','lndhub') ) NOT NULL DEFAULT 'lndhub',
		-- The Authentication of the wallet. api token in case lndhub and macaroon 
		-- bytes in case lnd. This blob should be encrypted
		auth BLOB NOT NULL,
		-- Human readable name to help the user identify each wallet
		name TEXT NOT NULL,
		-- The balance in satoshis
		balance INTEGER DEFAULT 0
	);

	-- Stores global metadata/configuration about any other table
	CREATE TABLE global_meta (
		key TEXT PRIMARY KEY,
		value TEXT
	) WITHOUT ROWID;
`,
}

// Open a connection pool for SQLite, enabling some needed functionality for our schema
// like foreign keys.
func Open(uri string, flags sqlite.OpenFlags, poolSize int) (*sqlitex.Pool, error) {
	return open(uri, flags, poolSize,
		"PRAGMA encoding = \"UTF-8\";",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA journal_mode = WAL;",
	)
}

func open(uri string, flags sqlite.OpenFlags, poolSize int, prelude ...string) (*sqlitex.Pool, error) {
	pool, err := sqlitex.Open(uri, flags, poolSize)
	if err != nil {
		return nil, err
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
