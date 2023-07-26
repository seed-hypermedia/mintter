-- Stores global metadata/configuration about any other table
CREATE TABLE global_meta (
    key TEXT PRIMARY KEY,
    value TEXT
) WITHOUT ROWID;

-- Stores the content of IPFS blobs.
CREATE TABLE blobs (
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
);

-- Stores known public keys and maps them to local short integer IDs.
CREATE TABLE public_keys (
    id INTEGER PRIMARY KEY,
    -- Principal is multicodec prefixed public key bytes.
    -- See https://github.com/multiformats/multicodec/blob/master/table.csv for possible values.
    principal BLOB UNIQUE NOT NULL
);

-- Stores derived information from Key Delegation blobs.
CREATE TABLE key_delegations (
    -- Issuer key.
    issuer INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
    -- Delegate key.
    delegate INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
    -- Key delegation blob ID.
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    -- Issue time.
    issue_time INTEGER NOT NULL,
    PRIMARY KEY (issuer, delegate, blob)
) WITHOUT ROWID;

CREATE INDEX idx_key_delegations_by_delegate ON key_delegations (delegate, issuer, blob);

CREATE INDEX idx_key_delegations_by_blob ON key_delegations (blob, issuer, delegate);

-- View of key delegations dereferencing foreign keys.
CREATE VIEW key_delegations_view AS
    SELECT
        kd.blob AS blob,
        blobs.codec AS blob_codec,
        blobs.multihash AS blob_multihash,
        iss.principal AS issuer,
        del.principal AS delegate,
        kd.issue_time AS issue_time
    FROM key_delegations kd
    JOIN blobs ON blobs.id = kd.blob
    JOIN public_keys iss ON iss.id = kd.issuer
    JOIN public_keys del ON del.id = kd.delegate
;

-- Stores IDs of Hypermedia Entities.
CREATE TABLE hd_entities (
    -- Local shorthand ID.
    id INTEGER PRIMARY KEY,
    -- Entity ID.
    eid TEXT UNIQUE NOT NULL CHECK (eid != '')
);

-- Changes to the Hypermedia Entities.
CREATE TABLE hd_changes (
    -- Entity being changed.
    entity INTEGER REFERENCES hd_entities (id) NOT NULL,
    -- Blob ID of the change.
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    -- HLC timestamp of the change.
    hlc_time INTEGER NOT NULL,
    -- Author of the change.
    author INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (entity, blob)
) WITHOUT ROWID;

CREATE INDEX idx_hd_changes_to_entity ON hd_changes (blob, entity);

-- View of changes with dereferences foreign keys.
CREATE VIEW hd_changes_view AS
    SELECT
        hd_changes.blob AS blob_id,
        hd_changes.entity AS entity_id,
        hd_changes.hlc_time AS hlc_time,
        hd_entities.eid AS entity,
        blobs.codec AS codec,
        blobs.multihash AS multihash,
        blobs.data AS data,
        blobs.size AS size
    FROM hd_changes
    JOIN blobs ON blobs.id = hd_changes.blob
    JOIN hd_entities ON hd_changes.entity = hd_entities.id
;

-- Draft changes. Only one draft is allowed for now.
CREATE TABLE hd_drafts (
    entity INTEGER PRIMARY KEY REFERENCES hd_entities (id) ON DELETE CASCADE NOT NULL,
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL
);

CREATE VIEW public_blobs_view AS
    SELECT
        blobs.id,
        blobs.codec,
        blobs.multihash
    FROM blobs
    LEFT OUTER JOIN hd_drafts ON hd_drafts.blob = blobs.id
    WHERE hd_drafts.blob IS NULL
;

-- View of drafts with dereferenced foreign keys.
CREATE VIEW hd_drafts_view AS
    SELECT
        hd_drafts.entity AS entity_id,
        hd_drafts.blob AS blob_id,
        hd_entities.eid AS entity,
        blobs.codec AS codec,
        blobs.multihash AS multihash
    FROM hd_drafts
    JOIN hd_entities ON hd_entities.id = hd_drafts.entity
    JOIN blobs ON blobs.id = hd_drafts.blob
;

-- Stores links between blobs.
CREATE TABLE hd_links (
    source_blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    -- TODO(burdiyan): normalize this to reduce disk usage.
    rel TEXT NOT NULL,
    target_entity INTEGER REFERENCES hd_entities (id),
    target_blob INTEGER REFERENCES blobs (id),
    data BLOB,
    CHECK ((target_entity, target_blob) IS NOT (null, null))
);

-- These are probably not the most optimal indices.
CREATE INDEX idx_hd_links_blobs ON hd_links (source_blob, target_blob) WHERE target_blob IS NOT NULL;
CREATE INDEX idx_hd_links_blobs_rev ON hd_links (target_blob, source_blob) WHERE target_blob IS NOT NULL;
CREATE INDEX idx_hd_links_by_target_entity ON hd_links (target_entity) WHERE target_entity IS NOT NULL;

-- View for dependency links between changes.
CREATE VIEW hd_change_deps AS
    SELECT
        source_blob AS child,
        target_blob AS parent
    FROM hd_links
    WHERE rel = 'change:depends'
    AND target_blob IS NOT NULL
;

CREATE VIEW content_links_view AS
    SELECT
        hd_changes.entity AS source_entity,
        sources.eid AS source_eid,
        hd_links.source_blob AS source_blob,
        blobs.codec AS source_blob_codec,
        blobs.multihash AS source_blob_multihash,
        hd_links.rel AS rel,
        hd_links.target_entity AS target_entity,
        targets.eid AS target_eid,
        hd_links.data AS data
    FROM hd_links
    JOIN hd_changes ON hd_changes.blob = hd_links.source_blob
    JOIN blobs ON blobs.id = hd_links.source_blob
    JOIN hd_entities sources ON sources.id = hd_changes.entity
    JOIN hd_entities targets ON targets.id = hd_links.target_entity
    WHERE rel GLOB 'href*'
    AND target_entity IS NOT NULL
;

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

-- Stores sites that user has manually added
CREATE TABLE sites (
    -- Site unique identification. The hostname of the site with protocol https://example.com
    hostname TEXT PRIMARY KEY CHECK(hostname <> ''),
    -- The role we play in the site ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
    role INTEGER NOT NULL DEFAULT 0,
    -- P2P addresses to connect to that site in the format of multiaddresses. Space separated.
    addresses TEXT NOT NULL CHECK(addresses <> ''),
    -- The account ID of the site. We need a previous connection to the site so the 
    -- actual account is inserted in the accounts table when handshake.
    account_id INTEGER REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL
) WITHOUT ROWID;

-- Table that stores all the tokens not yet redeemed inside a site. Although this table is relevant only
-- for sites at the beginning, keep in mind that any regular node can be upgraded to a site.
CREATE TABLE invite_tokens (
    -- Unique token identification. Random string.
    token TEXT PRIMARY KEY CHECK(token <> ''),
    -- The member role for the user that will redeem the token.
    -- OWNER = 1 | EDITOR = 2.
    role INTEGER NOT NULL CHECK (role != 0),
    -- Timestamp since the token will no longer be eligible to be redeemed. Seconds since  Jan 1, 1970
    expire_time INTEGER NOT NULL CHECK (expire_time > 0)
) WITHOUT ROWID;

-- Table that stores the role each account has inside a site. Although this table is relevant only
-- for sites at the beginning, keep in mind that any regular node can be upgraded to a site.
CREATE TABLE site_members (
    -- The account id that has been linked to a role on this site
    account_id INTEGER PRIMARY KEY REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
    -- The role of the site member.
    -- OWNER = 1 | EDITOR = 2.
    role INTEGER NOT NULL CHECK (role != 0)
);

-- We currently only allow one owner per site.
CREATE UNIQUE INDEX idx_site_owner ON site_members (role) WHERE role = 1;

-- Stores all the records published on this site. Although this table is relevant only
-- for sites at the beginning, keep in mind that any regular node can be upgraded to a site.
CREATE TABLE web_publications (
    -- Entity ID of the published document.
    eid TEXT PRIMARY KEY CHECK (eid != ''),
    -- doc version of the base document published. Not its references.
    version TEXT NOT NULL,
    -- Path this publication is published to. If NULL is not listed.
    path TEXT UNIQUE
);
