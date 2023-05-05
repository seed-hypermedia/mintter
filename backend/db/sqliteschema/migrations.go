package sqliteschema

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
	// Stores global metadata/configuration about any other table
	`CREATE TABLE global_meta (
		key TEXT PRIMARY KEY,
		value TEXT
	) WITHOUT ROWID;`,

	// Stores the content of IPFS blobs.
	`CREATE TABLE blobs (
		-- Short numerical ID to be used internally.
		-- The same ID is used for table 'changes'
		-- to avoid unnecessary joins.
		-- Using AUTOINCREMENT here to use monotonically increasing IDs as a cursor for syncing.
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		-- Original multihash of the IPFS blob.
		-- We don't store CIDs, this is what most blockstore
		-- implementations are doing.
		-- We don't want to store the content more than once,
		-- so UNIQUE constraint is needed here.
		-- We don't use multihash as a primary key to reduce the database size,
		-- as there're multiple other tables referencing records from this table.
		multihash BLOB UNIQUE NOT NULL,
		-- Multicodec describing the data stored in the blob.
		codec INTEGER NOT NULL,
		-- Actual content of the block. Compressed with zstd.
		data BLOB,
		-- Byte size of the original uncompressed data.
		-- Size 0 indicates that data is stored inline in the multihash.
		-- Size -1 indicates that we somehow know about this hash, but don't have the data yet.
		size INTEGER DEFAULT (-1) NOT NULL,
		-- Subjective (locally perceived) time when this block was inserted into the table for the first time.
		insert_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);`,

	// Stores known public keys and maps them to local short integer IDs.
	`CREATE TABLE public_keys (
		id INTEGER PRIMARY KEY,
		-- Principal is multicodec prefixed public key bytes.
		-- See https://github.com/multiformats/multicodec/blob/master/table.csv for possible values.
		principal BLOB UNIQUE NOT NULL
	);`,

	`CREATE TABLE key_delegations (
		id INTEGER PRIMARY KEY REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
		issuer INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
		delegate INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
		valid_from_time INTEGER NOT NULL,
		UNIQUE (issuer, delegate),
		UNIQUE (delegate, issuer)
	);`,

	`CREATE VIEW key_delegations_view AS
		SELECT
			kd.id AS id,
			blobs.codec AS blob_codec,
			blobs.multihash AS blobs_multihash,
			iss.principal AS issuer,
			del.principal AS delegate,
			kd.valid_from_time AS valid_from_time
		FROM key_delegations kd
		JOIN blobs ON blobs.id = kd.id
		JOIN public_keys iss ON iss.id = kd.issuer
		JOIN public_keys del ON del.id = kd.delegate;`,

	// Stores hypermedia entities.
	`CREATE TABLE hyper_entities (
		id INTEGER PRIMARY KEY,
		eid TEXT UNIQUE
	);`,

	`CREATE TABLE hyper_changes (
		blob INTEGER PRIMARY KEY REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
		entity INTEGER REFERENCES hyper_entities (id) ON DELETE CASCADE NOT NULL,
		hlc_time INTEGER NOT NULL
	);`,

	`CREATE INDEX idx_hyper_changes_by_entity ON hyper_changes (entity, hlc_time);`,

	`CREATE VIEW hyper_changes_by_entity_view AS
		SELECT
			hyper_changes.entity AS entity_id,
			hyper_changes.blob AS blob_id,
			blobs.codec AS codec,
			blobs.multihash AS multihash,
			blobs.data AS data,
			blobs.size AS size,
			hyper_changes.hlc_time AS hlc_time,
			draft_blobs.blob AS draft
		FROM hyper_changes
		JOIN blobs ON blobs.id = hyper_changes.blob
		LEFT JOIN draft_blobs ON hyper_changes.blob = draft_blobs.blob
		ORDER BY hlc_time;`,

	`CREATE TABLE draft_blobs (
		blob INTEGER PRIMARY KEY REFERENCES blobs (id) ON DELETE CASCADE NOT NULL
	);`,

	// Stores links between blobs.
	`CREATE TABLE hyper_links (
		blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
		-- TODO(burdiyan): normalize this to reduce disk usage.
		rel TEXT NOT NULL,
		target_entity INTEGER REFERENCES entities (id) ON DELETE CASCADE,
		target INTEGER REFERENCES blobs (id),
		data BLOB,
		CHECK ((target_entity, target) IS NOT (null, null))
	);`,

	// These are probably not the most optimal indices.
	`CREATE INDEX idx_hyper_links_by_blob ON hyper_links (blob);`,
	`CREATE INDEX idx_hyper_links_by_target_entity ON hyper_links (target_entity) WHERE target_entity IS NOT NULL;`,
	`CREATE INDEX idx_hyper_links_by_target ON hyper_links (target) WHERE target IS NOT NULL;`,

	// Stores the content of IPFS blobs.
	`CREATE TABLE ipfs_blocks (
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
		-- Size 0 indicates that data is stored inline in the CID.
		-- Size -1 indicates that we somehow know about this hash, but don't have the data yet.
		size INTEGER DEFAULT (-1) NOT NULL,
		-- Subjective (locally perceived) time when this block was inserted into the table for the first time.
		insert_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);`,

	// Stores IPLD links between ipfs_blocks for those nodes which are IPLD.
	`CREATE TABLE ipld_links (
		child INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		parent INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		path TEXT NOT NULL,
		PRIMARY KEY (child, parent)
	) WITHOUT ROWID;`,

	// Index to query IPLD links from parent to child.
	`CREATE INDEX idx_ipld_links_reverse ON ipld_links (parent, child);`,

	// Stores data about Mintter Accounts.
	`CREATE TABLE accounts (
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

	// Stores data about Mintter Devices.
	`CREATE TABLE devices (
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

	// Stores relationships between accounts and devices.
	`CREATE TABLE account_devices (
		account_id INTEGER REFERENCES accounts (id) NOT NULL,
		device_id INTEGER REFERENCES devices (id) NOT NULL,
		delegation_id INTEGER REFERENCES ipfs_blocks (id) DEFAULT NULL,
		PRIMARY KEY (account_id, device_id)
	) WITHOUT ROWID;`,

	// Helps to query accounts of a device.
	`CREATE INDEX idx_device_accounts ON account_devices (device_id, account_id);`,

	// Stores references to the IPFS blocks that are Mintter Permanodes.
	`CREATE TABLE permanodes (
		id INTEGER PRIMARY KEY REFERENCES ipfs_blocks (id) ON DELETE CASCADE,
		type TEXT NOT NULL CHECK (type != ''),
		account_id INTEGER REFERENCES accounts (id) NOT NULL,
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);`,

	// Index for querying permanodes by type.
	`CREATE INDEX idx_permanodes_by_type ON permanodes (type);`,

	// Index for querying permanodes by author.
	`CREATE INDEX idx_permanodes_by_author ON permanodes (account_id);`,

	`CREATE TABLE changes (
		id INTEGER PRIMARY KEY,
		permanode_id INTEGER REFERENCES permanodes (id) ON DELETE CASCADE NOT NULL,
		account_id INTEGER REFERENCES accounts (id) ON DELETE CASCADE NOT NULL,
		device_id INTEGER REFERENCES devices (id) ON DELETE CASCADE NOT NULL,
		kind TEXT,
		-- Hybrid Logical Timestamp when change was created.
		start_time INTEGER NOT NULL
		-- You can imagine this foreign key exist, but it's disabled
		-- because draft changes don't have the corresponding record
		-- in the ipfs_blocks table until they are actually published.
		-- The integer ID for both this table and ipfs_blocks is allocated
		-- by manually incrementing the internal sqlite_sequence table where
		-- the corresponding record for the AUTOINCREMENT ID in ipfs_blocks table
		-- is created by SQLite automatically.
		-- FOREIGN KEY (id) REFERENCES ipfs_blocks (id) ON DELETE CASCADE
	);`,

	`CREATE INDEX idx_changes_by_object ON changes (permanode_id);`,

	`CREATE INDEX idx_changes_by_account ON changes (account_id);`,

	`CREATE TABLE draft_changes (
		id INTEGER PRIMARY KEY REFERENCES changes (id) ON DELETE CASCADE,
		permanode_id INTEGER REFERENCES permanodes (id) ON DELETE CASCADE UNIQUE
	) WITHOUT ROWID;`,

	// View of IPFS blobs which are public and safe to provide.
	`CREATE VIEW public_blobs AS
		SELECT codec, multihash
		FROM ipfs_blocks
		WHERE size >= 0
		AND id NOT IN (SELECT id FROM draft_changes)
	;`,

	// View of changes with dereferenced CIDs.
	`CREATE VIEW changes_deref AS
		SELECT
			changes.id AS change_id,
			changes.permanode_id AS permanode_id,
			object_blobs.codec AS object_codec,
			object_blobs.multihash AS object_hash,
			change_blobs.codec As change_codec,
			change_blobs.multihash AS change_hash,
			CASE WHEN draft_changes.id > 0 THEN 1 ELSE 0 END AS is_draft
		FROM changes
		JOIN ipfs_blocks AS change_blobs ON changes.id = change_blobs.id
		JOIN ipfs_blocks AS object_blobs ON changes.permanode_id = object_blobs.id
		LEFT OUTER JOIN draft_changes ON draft_changes.id = changes.id
		ORDER BY changes.permanode_id, changes.start_time, change_blobs.multihash
	;`,

	`CREATE TABLE change_deps (
		child INTEGER REFERENCES changes (id) ON DELETE CASCADE NOT NULL,
		parent INTEGER REFERENCES changes (id) NOT NULL,
		PRIMARY KEY (child, parent)
	) WITHOUT ROWID;`,

	`CREATE INDEX idx_change_rdeps ON change_deps (parent, child);`,

	`CREATE VIEW change_heads AS
		SELECT changes.*
		FROM changes
		WHERE changes.id NOT IN (SELECT parent FROM change_deps)
	;`,

	// View to easily get the block ID of the delegation proof.
	`CREATE VIEW device_proofs AS
		SELECT
			accounts.multihash AS account_hash,
			devices.multihash AS device_hash,
			ipfs_blocks.codec AS delegation_codec,
			ipfs_blocks.multihash AS delegation_hash
		FROM account_devices
		JOIN accounts ON accounts.id = account_devices.account_id
		JOIN devices ON devices.id = account_devices.device_id
		JOIN ipfs_blocks ON account_devices.delegation_id = ipfs_blocks.id
	;`,

	`CREATE TABLE content_links (
		source_document_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		source_block_id TEXT NOT NULL,
		-- In theory this is not needed, because source_change_id will always be the correct version.
		-- but to simplify the queries we store it here too.
		source_version TEXT NOT NULL,
		source_change_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		target_document_id INTEGER REFERENCES ipfs_blocks (id) ON DELETE CASCADE NOT NULL,
		target_block_id TEXT NOT NULL,
		target_version TEXT NOT NULL,
		PRIMARY KEY (target_document_id, target_block_id, target_version, source_document_id, source_block_id, source_change_id)
	) WITHOUT ROWID;`,

	`CREATE INDEX content_links_by_source ON content_links (source_document_id, source_block_id);`,

	// Stores Lightning wallets both externals (imported wallets like bluewallet
	// based on lndhub) and internals (based on the LND embedded node).
	`CREATE TABLE wallets (
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
		-- The password to access the wallet. Passphrase in case of lndhub and the encryption 
		-- key to unlock the internal wallet in case of LND.
		password BLOB NOT NULL,
		-- The Authentication token of the wallet. api token in case of lndhub
		token BLOB,
		-- Human readable name to help the user identify each wallet
		name TEXT NOT NULL,
		-- The balance in satoshis
		balance INTEGER DEFAULT 0
	);`,

	// Stores sites that user has manually added
	`CREATE TABLE sites (
		-- Site unique identification. The hostname of the site with protocol https://example.com
		hostname TEXT PRIMARY KEY CHECK(hostname <> ''),
		-- The role we play in the site ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL DEFAULT 0,
		-- P2P addresses to connect to that site in the format of multiaddresses. Space separated.
		addresses TEXT NOT NULL CHECK(addresses <> ''),
		-- The account ID of the site. We need a previous connection to the site so the 
		-- actual account is inserted in the accounts table when handshake.
		account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE
	) WITHOUT ROWID;`,

	// Table that stores all the tokens not yet redeemed inside a site. Although this table is relevant only
	// for sites at the beginning, keep in mind that any regular node can be upgraded to a site.
	`CREATE TABLE invite_tokens (
		-- Unique token identification. Random 8 char words
		token TEXT PRIMARY KEY CHECK(token <> ''),
		-- The role the token will allow ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL DEFAULT 2,
		-- Timestamp since the token will no longer be eligible to be redeemed. Seconds since  Jan 1, 1970
		expiration_time INTEGER NOT NULL CHECK (expiration_time > 0)
	) WITHOUT ROWID;`,

	// Table that stores the role each account has inside a site. Although this table is relevant only
	// for sites at the beginning, keep in mind that any regular node can be upgraded to a site.
	`CREATE TABLE site_members (
		-- The account id that has been linked to a role on this site
		account_id INTEGER PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
		-- The role the account holds ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL
	) WITHOUT ROWID;`,

	// Stores all the records published on this site. Although this table is relevant only
	// for sites at the beginning, keep in mind that any regular node can be upgraded to a site.
	`CREATE TABLE web_publication_records (
		-- Ipfs block where the base document is stored.
		block_id INTEGER PRIMARY KEY REFERENCES ipfs_blocks (id) ON DELETE CASCADE CHECK (block_id != 0),
		-- doc version of the base document published. Not its references.
		document_version TEXT NOT NULL,
		-- Path this publication is published to. If NULL is not listed.
		path TEXT UNIQUE
	) WITHOUT ROWID;`,
}
