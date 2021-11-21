package sqliteschema

import (
	"fmt"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/multierr"
)

const (
	walletsTable               = "`wallets`"
	indexColumn                = "`id`"
	defaultWalletColumn        = "`default_wallet`"
	typeWalletColumn           = "`type`"
	authWalletColumn           = "`auth`"
	nameWalletColumn           = "`name`"
	initialBalanceWalletColumn = "`initial_balance`"
)

type Wallet struct {
	Id              string
	Name            string
	Type            string
	Auth            []byte
	Default_wallet  int64
	Initial_balance int64
}

// Migration is a type for a migration function.
// Eventually we might want to make avaiable other things to migration handlers.
type Migration func(conn *sqlite.Conn) error

// SQLMigration is a migration function that applies one or multiple
// SQL statements to the database.
func SQLMigration(stmts ...string) Migration {
	return func(conn *sqlite.Conn) error {
		for _, s := range stmts {
			if err := sqlitex.ExecTransient(conn, s, nil); err != nil {
				return err
			}
		}
		return nil
	}
}

// The list with a global set of database migrations.
// Append-only! DO NOT REMOVE, EDIT, OR REORDER PREVIOUS ENTRIES.
// Do not add statements to existing SQLMigration, create new ones instead.
var migrations = []Migration{
	// This is the initial set of tables. Do not alter after the schema is already stable.
	SQLMigration(
		`-- Stores the content of IPFS blobs.
		CREATE TABLE ipfs_blobs (
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
			-- Actual content of the blob.
			content BLOB NOT NULL,
			-- Subjective (locally perceived) time when this block was fetched for the first time.
			-- Not sure if actually useful, but might become at some point.
			create_time TIMESTAMP DEFAULT (datetime('now')) NOT NULL
		);`,

		`-- Stores data about Mintter Accounts.
		CREATE TABLE accounts (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Bytes of the CID-encoded Mintter Account ID.
			cid BLOB UNIQUE NOT NULL,
			-- Currently known value for the profile alias.
			alias TEXT,
			-- Currently known value for the profile bio.
			bio TEXT,
			-- Currently known value for the profile email.
			email TEXT
		);`,

		`-- Stores data about Mintter Devices.
		CREATE TABLE devices (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Bytes of the CID-encoded device ID.
			cid BLOB UNIQUE NOT NULL,
			-- Bytes of the public key.
			-- Mostly NULL because Ed25519 keys can be extracted from the CID.
			public_key BLOB DEFAULT NULL,
			-- Reference to the Account this Device belongs to.
			account_id INTEGER REFERENCES accounts NOT NULL
		);`,

		`-- Stores data about Mintter Objects.
		CREATE TABLE objects (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- Bytes of the CID-encoded Object ID.
			cid BLOB UNIQUE NOT NULL,
			-- Reference to the Account that created the Object.
			account_id INTEGER REFERENCES accounts NOT NULL
		);`,

		`-- Stores changes for objects.
		CREATE TABLE changes (
			-- Reference to the Object being changed.
			object_id INTEGER REFERENCES objects NOT NULL,
			-- Reference to the Device that signed the Change.
			device_id INTEGER REFERENCES devices NOT NULL,
			-- Sequence number from the Change.
			seq INTEGER NOT NULL,
			-- Lamport timestamp of the Change.
			lamport_time INTEGER NOT NULL,
			-- Reference to the IPFS Blob with contents of the Change.
			ipfs_blob_id INTEGER REFERENCES ipfs_blobs NOT NULL,
			-- Composite key that uniquely identifies a Change.
			PRIMARY KEY (object_id, device_id, seq)
		) WITHOUT ROWID;`,

		`-- Stores Mintter Documents (drafts and publications) and caches some of their attributes.
		CREATE TABLE documents (
			-- Short numerical ID to be used internally.
			id INTEGER PRIMARY KEY,
			-- The following properties are basically a cache of the most recently known values.
			-- Useful for list views to avoid reading and resolving Changes of all the Documents.
			title TEXT,
			subtitle TEXT,
			draft_title TEXT,
			draft_subtitle TEXT,
			draft_content BLOB,
			create_time TIMESTAMP NOT NULL,
			update_time TIMESTAMP NOT NULL,
			publish_time TIMESTAMP,
			-- The most up to date version we know about the Document.
			-- Useful for detecting that we're reading an out of date version.
			latest_version TEXT,
			-- Our ID actually references objects table, because Documents are actually Objects.
			-- But not all Objects are Documents.
			FOREIGN KEY (id) REFERENCES objects
		);`,

		`-- Index to list drafts.
		CREATE INDEX documents_draft_content ON documents (draft_content, NOT NULL);`,

		`-- Index to list published documents.
		CREATE INDEX documents_publish_time ON documents (publish_time, NOT NULL);`,

		`-- Index for links from Documents.
		CREATE TABLE links (
			-- Reference to Document ID from which link originates.
			source_document_id INTEGER REFERENCES documents NOT NULL,
			-- Block ID inside the Document which contains the link.
			source_block_id TEXT NOT NULL,
			-- Reference to Document ID that is linked.
			target_document_id INTEGER REFERENCES documents NOT NULL,
			-- Block ID that is linked. Can be NULL if links is to the whole Document.
			target_block_id TEXT,
			-- Version of the target Document that is linked.
			target_document_version TEXT NOT NULL,
			-- Reference to Change that created a link.
			-- Since each Change references all the dependant changes
			-- the ID of the Change is guaranteed to be a valid Version
			-- to identify the state of the source Document.
			source_change_id INTEGER REFERENCES changes NOT NULL
		);`,

		`-- Index for backlinks.
		CREATE INDEX links_target_document_id ON links (target_document_id);`,

		`-- Virtual table for backlinks.
		CREATE VIRTUAL TABLE backlinks USING transitive_closure (
			tablename = 'links',
			-- We need to treat target documents as parents
			-- for transitive closure to inclide the source documents.
			idcolumn = 'source_document_id',
			parentcolumn = 'target_document_id'
		);`,
		`-- Stores Lightning wallets both externals (imported wallets like bluewallet
		 -- based on lndhub) and internals (based on the LND embedded node).
		CREATE TABLE `+walletsTable+` (
			-- Wallet unique ID. Is the url hash in case of lndhub or the pubkey in case of LND.
			`+indexColumn+` TEXT PRIMARY KEY,
			-- The type of the wallet. Either lnd or lndhub
			`+typeWalletColumn+` TEXT CHECK( type IN ('lnd','lndhub') ) NOT NULL DEFAULT 'lndhub',
			-- The Authentication of the wallet. api token in case lndhub and macaroon 
			-- bytes in case lnd. This blob should be encrypted
			`+authWalletColumn+` BLOB NOT NULL,
			-- Wether or not this wallet is the default wallet. 1 default 0 non default
			`+defaultWalletColumn+` INTEGER CHECK( default_wallet IN (0, 1) ) NOT NULL DEFAULT 0,
			-- Human readable name to help the user identify each wallet
			`+nameWalletColumn+` TEXT NOT NULL,
			-- The balance in satoshis the wallet had at the moment of creation. For audit purposes
			`+initialBalanceWalletColumn+` INT
		);`,
	),
}

// Migrate the database applying migrations defined in this package.
// migration is done in a transaction.
func Migrate(conn *sqlite.Conn) error {
	return migrate(conn, migrations)
}

func migrate(conn *sqlite.Conn, migrations []Migration) error {
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
		for _, fn := range migrations[v:] {
			if err := fn(conn); err != nil {
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
