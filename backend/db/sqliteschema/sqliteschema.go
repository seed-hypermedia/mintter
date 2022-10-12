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
		"SQLite",
	)
}

// Initially we wanted to use a list of SQL scripts as an imperative list of schema migrations
// that must be executed one by one until the end. This is very common approach for managing
// SQL database schema migrations.
// But SQLite is a bit more peculiar in this case, and have very limited ALTER TABLE capabilities.
// For complex schema migrations they actually recommend a very specific 12-step procedure, which must
// be implemented very thoroughly.
// There're multiple approaches in the wild for imperative and declarative schema migrations for SQLite,
// so eventually we need to implement one, following the recommended procedure.
//
// See more at: https://www.sqlite.org/lang_altertable.html
var migrations = []string{
	`-- Stores global metadata/configuration about any other table
	CREATE TABLE global_meta (
		key TEXT PRIMARY KEY,
		value TEXT
	) WITHOUT ROWID;`,

	`-- Stores the content of IPFS blobs.
	CREATE TABLE ipfs_blocks (
		-- Short numerical ID to be used internally.
		-- The same ID is used for table 'changes'
		-- to avoid unnecessary joins.
		-- Using AUTOINCREMENT here to be able to allocate
		-- change IDs without having to create records,
		-- by manually updating the internal sqlite_sequence table.
		id INTEGER PRIMARY KEY AUTOINCREMENT,
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
	);`,

	`-- Stores data about Mintter Accounts.
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
	);`,

	`-- Stores profile information.
	CREATE TABLE profiles (
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL,
		alias TEXT,
		email TEXT,
		bio TEXT,
		change_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (account_id, change_id),
		CHECK (account_id != change_id)
	) WITHOUT ROWID;`,

	`-- Stores data about Mintter Devices.
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
	);`,

	`-- Stores relationships between accounts and devices.
	CREATE TABLE account_devices (
		account_id INTEGER REFERENCES accounts NOT NULL,
		device_id INTEGER REFERENCES devices NOT NULL,
		PRIMARY KEY (account_id, device_id)
	) WITHOUT ROWID;`,

	`-- Helps to query accounts of a device.
	CREATE INDEX idx_device_accounts ON account_devices (device_id, account_id);`,

	`-- Stores references to the IPFS blocks that are Mintter Permanodes.
	CREATE TABLE permanodes (
		id INTEGER PRIMARY KEY,
		type TEXT NOT NULL CHECK (type != ''),
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
		FOREIGN KEY (id) REFERENCES ipfs_blocks ON DELETE CASCADE
	);`,

	`-- Help to query permanodes by type.
	CREATE INDEX idx_permanodes_by_type ON permanodes (type);`,

	`-- Stores owners of the Mintter Permanode objects.
	CREATE TABLE permanode_owners (
		account_id INTEGER REFERENCES accounts NOT NULL,
		permanode_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (account_id, permanode_id)
	) WITHOUT ROWID;`,

	`-- Helps to query by owners of a permanode.
	CREATE INDEX idx_permanode_owners_by_permanode ON permanode_owners (permanode_id, account_id);`,

	`CREATE TABLE changes (
		id INTEGER PRIMARY KEY,
		permanode_id INTEGER REFERENCES permanodes ON DELETE CASCADE NOT NULL,
		kind TEXT,
		lamport_time INTEGER NOT NULL,
		create_time INTEGER NOT NULL
		-- You can imagine this foreign key exist, but it's disabled
		-- because draft changes don't have the corresponding record
		-- in the ipfs_blocks table until they are actually published.
		-- The integer ID for both this table and ipfs_blocks is allocated
		-- by manually incrementing the internal sqlite_sequence table where
		-- the corresponding record for the AUTOINCREMENT ID in ipfs_blocks table
		-- is created by SQLite automatically.
		-- FOREIGN KEY (id) REFERENCES ipfs_blocks ON DELETE CASCADE
	);`,

	`CREATE TABLE change_deps (
		child INTEGER REFERENCES changes ON DELETE CASCADE NOT NULL,
		parent INTEGER REFERENCES changes NOT NULL,
		PRIMARY KEY (child, parent)
	) WITHOUT ROWID;`,

	`CREATE TABLE change_authors (
		change_id INTEGER REFERENCES changes ON DELETE CASCADE NOT NULL,
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL,
		device_id INTEGER REFERENCES devices ON DELETE CASCADE NOT NULL,
		PRIMARY KEY (change_id, account_id, device_id)
	) WITHOUT ROWID;`,

	`CREATE TABLE datom_attrs (
		id INTEGER PRIMARY KEY,
		attr TEXT UNIQUE
	);`,

	`CREATE TABLE datoms (
		-- Mintter Object that datom is applied to.
		permanode INTEGER REFERENCES permanodes ON DELETE CASCADE NOT NULL,
		-- Entity within Mintter Object.
		entity BLOB NOT NULL,
		-- Attribute.
		attr INTEGER REFERENCES datom_attrs NOT NULL,
		-- Value types. See the code for possible values types.
		value_type INTEGER NOT NULL,
		-- Value of the attribute.
		value BLOB NOT NULL,
		-- Change that introduced the datom.
		change INTEGER REFERENCES changes ON DELETE CASCADE NOT NULL,
		-- Sequence ID within the change that introduced the datom.
		seq INTEGER NOT NULL CHECK (seq > 0),
		PRIMARY KEY (change, seq)
	) WITHOUT ROWID;`,

	`CREATE INDEX datoms_eavt ON datoms (permanode, entity, attr);
	CREATE INDEX datoms_aevt ON datoms (permanode, attr, entity);
	CREATE INDEX datoms_vaet ON datoms (permanode, value, attr, entity) WHERE value_type = 0;`, // value type 0 is a ref

	`CREATE TABLE named_versions (
		object_id INTEGER REFERENCES permanodes ON DELETE CASCADE NOT NULL,
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL,
		device_id INTEGER REFERENCES devices ON DELETE CASCADE NOT NULL,
		name TEXT NOT NULL,
		version TEXT NOT NULL,
		PRIMARY KEY (object_id, name, account_id, device_id)
	) WITHOUT ROWID;`,

	`CREATE TABLE content_links (
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
	
	CREATE INDEX content_links_by_source ON content_links (source_document_id, source_block_id);`,

	`-- Stores Lightning wallets both externals (imported wallets like bluewallet
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
	);`,
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

// TODO(burdiyan): call 'PRAGMA optimize' before closing connections.
// See: https://www.sqlite.org/lang_analyze.html.

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
