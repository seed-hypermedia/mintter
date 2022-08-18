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
		multihash BLOB UNIQUE NOT NULL,
		-- Multicodec describing the data stored in the block.
		codec INTEGER NOT NULL,
		-- Actual content of the block. Compressed with zstd.
		data BLOB,
		-- Byte size of the original uncompressed data.
		size INTEGER DEFAULT (0) NOT NULL,
		-- Subjective (locally perceived) time when this block was inserted into the table for the first time.
		insert_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
		-- Pending blocks are those for which we know the hash, but we don't have the content yet.
		pending INTEGER DEFAULT (0) NOT NULL CHECK (pending IN (0, 1))
	);

	-- Stores data about Mintter Accounts.
	CREATE TABLE accounts (
		-- Short numerical ID to be used internally.
		id INTEGER PRIMARY KEY,
		-- Multihash part of the Account ID.
		multihash BLOB UNIQUE NOT NULL,
		-- Bytes of the public key.
		-- Mostly NULL because Ed25519 keys can be extracted from the CID.
		public_key BLOB DEFAULT NULL,
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
		proof BLOB NOT NULL,
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

	-- Stores document-related indexed attributes.
	CREATE TABLE document_changes (
		id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		title TEXT NOT NULL,
		subtitle TEXT NOT NULL,
		change_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		change_time INTEGER NOT NULL,
		PRIMARY KEY (id, change_id),
		CHECK(id != change_id)
	) WITHOUT ROWID;

	CREATE TABLE content_links (
		source_document_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		source_block_id TEXT NOT NULL,
		-- In theory this is not needed, because source_change_id will always be the correct version.
		-- but to simplify the queries we store it here too.
		source_version TEXT NOT NULL,
		source_change_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		target_document_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		target_block_id TEXT NOT NULL,
		target_version TEXT NOT NULL,
		PRIMARY KEY (target_document_id, target_block_id, target_version, source_document_id, source_block_id, source_change_id)
	) WITHOUT ROWID;

	CREATE INDEX content_links_by_source ON content_links (source_document_id, source_block_id);

	-- Stores Lightning wallets both externals (imported wallets like bluewallet
	-- based on lndhub) and internals (based on the LND embedded node).
	CREATE TABLE wallets (
        -- Wallet unique ID. Is the connection uri hash.
        id TEXT PRIMARY KEY,
        -- The type of the wallet.
        type TEXT CHECK( type IN ('lnd','lndhub.go','lndhub') ) NOT NULL DEFAULT 'lndhub.go',
        -- Address of the LND node backing up this wallet. In case lndhub, this will be the 
        -- URL to connect via rest api. In case LND wallet, this will be the gRPC address.
        address TEXT NOT NULL,
        -- The login to access the wallet. Login in case lndhub and the macaroon 
        -- bytes in case lnd.
        login BLOB NOT NULL,
        -- The password to access the wallet. Passphrase in case of lndhub and the encrytion 
		-- key to unlock the internal wallet in case of LND.
        password BLOB NOT NULL,
        -- The Authentication token of the wallet. api token in case of lndhub
        token BLOB,
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
