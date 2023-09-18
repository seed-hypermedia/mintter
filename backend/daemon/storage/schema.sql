-- Stores arbitrary key/value data that didn't deserve its own table.
CREATE TABLE kv (
    key TEXT PRIMARY KEY,
    value TEXT
) WITHOUT ROWID;

-- Lookup values that are used in other tables
-- as integers to reduce the database size.
-- Using a single table for different types of values,
-- to allow polymorphic foreign keys in other tables.
-- TODO(burdiyan): eventually this table would need periodic cleanup,
-- because when values get unreferenced they will remain in the table anyway.
CREATE TABLE lookup (
    id INTEGER PRIMARY KEY,
    -- Type of the value.
    -- See Lookup* constants in schema.go file for possible options.
    -- We use unicode code points to make it easier to write queries.
    type INTEGER NOT NULL,
    value NOT NULL
);

-- Using hash of the value to reduce the size of the index.
-- We additionally have a covering index by type and value.
CREATE UNIQUE INDEX lookup_value_unique ON lookup (sha1(value));

CREATE INDEX lookup_by_type ON lookup (type, value);

-- Stores the content of IPFS blobs.
CREATE TABLE blobs (
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
);

CREATE VIEW public_keys AS
SELECT
    id,
    value AS principal
FROM lookup
WHERE type = unicode('p');

-- Stores the accounts that used marked as trusted.
CREATE TABLE trusted_accounts (
    -- Account that we trust. Lookup value must be of type public key.
    id INTEGER REFERENCES lookup (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (id)
) WITHOUT ROWID;

CREATE VIEW entities AS
SELECT
    id,
    value AS eid
FROM lookup
WHERE type = unicode('r');

-- Changes to the Hypermedia Entities.
CREATE TABLE changes (
    -- Entity being changed.
    entity INTEGER REFERENCES lookup (id) NOT NULL,
    -- Blob ID of the change.
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    -- HLC timestamp of the change.
    hlc_time INTEGER NOT NULL,
    -- Author of the change.
    author INTEGER REFERENCES lookup (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (entity, blob)
) WITHOUT ROWID;

CREATE INDEX changes_by_entity ON changes (blob, entity);
CREATE INDEX changes_by_author ON changes (author);

-- View of changes with dereferences foreign keys.
CREATE VIEW changes_view AS
SELECT
    changes.blob AS blob_id,
    changes.entity AS entity_id,
    changes.hlc_time AS hlc_time,
    entities.eid AS entity,
    blobs.codec AS codec,
    blobs.multihash AS multihash,
    blobs.data AS data,
    blobs.size AS size
FROM changes
JOIN blobs ON blobs.id = changes.blob
JOIN entities ON changes.entity = entities.id;

-- Draft changes. Only one draft is allowed for now.
CREATE TABLE drafts (
    entity INTEGER REFERENCES lookup (id) ON DELETE CASCADE NOT NULL,
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (entity, blob)
) WITHOUT ROWID;

CREATE INDEX drafts_by_blob ON drafts (blob);

-- Index to ensure only one draft is allowed. Defining it separately,
-- so it's easier to drop eventually without a complex migration.
CREATE UNIQUE INDEX drafts_unique ON drafts (entity);

CREATE VIEW public_blobs_view AS
SELECT
    blobs.id,
    blobs.codec,
    blobs.multihash
FROM blobs
LEFT OUTER JOIN drafts ON drafts.blob = blobs.id
WHERE drafts.blob IS NULL;

-- View of drafts with dereferenced foreign keys.
CREATE VIEW drafts_view AS
SELECT
    drafts.entity AS entity_id,
    drafts.blob AS blob_id,
    entities.eid AS entity,
    blobs.codec AS codec,
    blobs.multihash AS multihash
FROM drafts
JOIN entities ON entities.id = drafts.entity
JOIN blobs ON blobs.id = drafts.blob;

CREATE TABLE blob_links (
    source INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    target INTEGER REFERENCES blobs (id) NOT NULL,
    rel TEXT NOT NULL,
    PRIMARY KEY (source, rel, target)
) WITHOUT ROWID;

CREATE UNIQUE INDEX blob_links_by_rel ON blob_links (rel, source, target);
CREATE UNIQUE INDEX blob_links_by_target ON blob_links (target, rel, source);

CREATE TABLE blob_attrs (
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    anchor TEXT NOT NULL DEFAULT (''),
    is_lookup INTEGER NOT NULL DEFAULT (0),
    value,
    extra,
    ts INTEGER NOT NULL,
    value_ptr INTEGER REFERENCES lookup (id) GENERATED ALWAYS AS (IIF(is_lookup = 1, value, NULL)) VIRTUAL
);

CREATE INDEX blob_attrs_by_key ON blob_attrs (key, blob);
CREATE INDEX blob_attrs_by_blob ON blob_attrs (blob, key);
CREATE INDEX blob_attrs_by_value ON blob_attrs (value_ptr, key) WHERE value_ptr IS NOT NULL;

CREATE VIEW key_delegations AS
SELECT
    blob AS blob,
    MAX(IIF(key = 'kd/issuer', value_ptr, NULL)) AS issuer,
    MAX(IIF(key = 'kd/delegate', value_ptr, NULL)) AS delegate
FROM blob_attrs
WHERE key IN ('kd/issuer', 'kd/delegate')
GROUP BY blob;

-- View of key delegations dereferencing foreign keys.
CREATE VIEW key_delegations_view AS
SELECT
    kd.blob AS blob,
    blobs.codec AS blob_codec,
    blobs.multihash AS blob_multihash,
    iss.principal AS issuer,
    del.principal AS delegate
FROM key_delegations kd
JOIN blobs ON blobs.id = kd.blob
JOIN public_keys iss ON iss.id = kd.issuer
JOIN public_keys del ON del.id = kd.delegate;

-- Stores head blobs for each resource.
-- Each named head can have more than one blob,
-- so there can be multiple rows for each resource and name.
CREATE TABLE heads (
    resource INTEGER REFERENCES lookup (id) NOT NULL,
    name TEXT NOT NULL,
    blob INTEGER REFERENCES blobs (id) NOT NULL,
    PRIMARY KEY (resource, name, blob)
) WITHOUT ROWID;

CREATE INDEX heads_by_blob ON heads (blob);

-- View for dependency links between changes.
CREATE VIEW change_deps AS
SELECT
    source AS child,
    target AS parent
FROM blob_links
WHERE rel = 'change/dep';

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
    -- The password to access the wallet. Passphrase in case of lndhub and the encryption 
    -- key to unlock the internal wallet in case of LND.
    password BLOB NOT NULL,
    -- The Authentication token of the wallet. api token in case of lndhub
    token BLOB,
    -- Human readable name to help the user identify each wallet
    name TEXT NOT NULL,
    -- The balance in satoshis
    balance INTEGER DEFAULT 0
);

-- Stores remote sites and their syncing status.
CREATE TABLE remote_sites (
    url TEXT UNIQUE NOT NULL,
    peer_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    group_version TEXT NOT NULL,
    last_sync_time INTEGER NOT NULL,
    last_ok_sync_time INTEGER NOT NULL
);
