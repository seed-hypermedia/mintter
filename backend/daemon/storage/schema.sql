-- Stores arbitrary key/value data that didn't deserve its own table.
CREATE TABLE kv (
    key TEXT PRIMARY KEY,
    value TEXT
) WITHOUT ROWID;

-- Stores the public keys that we know about.
-- The public key is stored in a principal encoding,
-- which is `<pub-key-type-multicodec><pub-key-bytes>`.
CREATE TABLE public_keys (
    id INTEGER PRIMARY KEY,
    principal BLOB UNIQUE NOT NULL
);

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
    -- Subjective (locally perceived) time when this blob was inserted.
    insert_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

-- Index for better data locality when we need to iterate over blobs without their data.
-- Without the index loading the entire list of blobs into memory takes forever,
-- because SQLite has to read way too many pages skipping the actual blob data.
CREATE INDEX blobs_metadata ON blobs (id, multihash, codec, size, insert_time);
CREATE INDEX blobs_metadata_by_hash ON blobs (multihash, codec, size, insert_time);

-- Stores some relevant attributes for structural blobs,
-- which are those blobs that we can understand more deeply than just an opaque blob.
CREATE TABLE structural_blobs (
    id INTEGER PRIMARY KEY REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
    -- Type of the structural blob.
    type TEXT NOT NULL,
    -- For structural blobs that have timestamps,
    -- this is the UNIX timestamp in microseconds.
    ts INTEGER,
    -- For structural blobs that have a clear author,
    -- this is the public key of the author.
    author INTEGER REFERENCES public_keys (id),
    -- For blobs that refer to some hypermedia resource
    -- this is the reference to the resource.
    resource INTEGER REFERENCES resources (id),
    -- Metadata about the content of the blob.
    -- The title of the document or group. The bio of the Account.
    meta TEXT
) WITHOUT ROWID;

CREATE INDEX structural_blobs_by_author ON structural_blobs (author, resource) WHERE author IS NOT NULL;
CREATE INDEX structural_blobs_by_resource ON structural_blobs (resource, author) WHERE resource IS NOT NULL;
CREATE INDEX structural_blobs_by_ts ON structural_blobs(ts, resource) WHERE ts IS NOT NULL;

-- View of structural blobs with dereferences foreign keys.
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

-- View blobs metadata It returns the latest non null title or the 
-- latest blob in case of untitled meta.
CREATE VIEW meta_view AS
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

-- Stores extra information for key delegation blobs.
CREATE TABLE key_delegations (
    id INTEGER PRIMARY KEY REFERENCES blobs (id) ON UPDATE CASCADE NOT NULL,
    issuer INTEGER REFERENCES public_keys (id),
    delegate INTEGER REFERENCES public_keys (id)
) WITHOUT ROWID;

CREATE INDEX key_delegations_by_issuer ON key_delegations (issuer, delegate);
CREATE INDEX key_delegations_by_delegate ON key_delegations (delegate, issuer);

CREATE VIEW key_delegations_view AS
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

-- Stores hypermedia resources.
-- All resources are identified by an IRI[iri],
-- might have an owner identified by a public key.
--
-- [iri]: https://en.wikipedia.org/wiki/Internationalized_Resource_Identifier
CREATE TABLE resources (
    id INTEGER PRIMARY KEY,
    iri TEXT UNIQUE NOT NULL,
    owner INTEGER REFERENCES public_keys (id),
    -- For resource that we can infer a creation time.
    -- Stored as unix timestamp in *seconds*.
    create_time INTEGER
);

CREATE INDEX resources_by_owner ON resources (owner) WHERE owner IS NOT NULL;

-- Stores deleted hypermedia resources.
-- In order to bring back content we need to keep track of 
-- what's been deleted. Also, in order not to sync it back
-- accidentally, we need to check whether the blob is related
-- to a deleted resource.
CREATE TABLE deleted_resources (
    iri TEXT PRIMARY KEY,
    delete_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    reason TEXT,
    -- Extra metadata can be stored like the title, probably in JSON format.
    meta TEXT
);

-- Stores content-addressable links between blobs.
-- Links are typed (rel) and directed.
CREATE TABLE blob_links (
    source INTEGER REFERENCES blobs (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
    target INTEGER REFERENCES blobs (id) ON UPDATE CASCADE NOT NULL,
    type TEXT NOT NULL,
    PRIMARY KEY (source, type, target)
) WITHOUT ROWID;

CREATE UNIQUE INDEX blob_backlinks ON blob_links (target, type, source);

-- Stores links from blobs to resources.
-- Resource links can be open-ended or pinned.
-- Pinned links point to a specific version of the resource.
-- Version is determined by the has of one or multiple blobs.
-- Non-pinned links point to the latest version of the resource we can find.
-- Extra metadata can be stored along with the link, probably in JSON format.
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

-- Stores the accounts that used marked as trusted.
CREATE TABLE trusted_accounts (
    id INTEGER PRIMARY KEY REFERENCES public_keys (id) NOT NULL
) WITHOUT ROWID;

-- Draft changes. Only one draft is allowed for now.
CREATE TABLE drafts (
    resource INTEGER REFERENCES resources (id) NOT NULL,
    blob INTEGER REFERENCES blobs (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (resource, blob)
) WITHOUT ROWID;

CREATE INDEX drafts_by_blob ON drafts (blob);

-- Index to ensure only one draft is allowed. Defining it separately,
-- so it's easier to drop eventually without a complex migration.
CREATE UNIQUE INDEX drafts_unique ON drafts (resource);

-- View of drafts with dereferenced foreign keys.
CREATE VIEW drafts_view AS
SELECT
    drafts.resource AS resource_id,
    drafts.blob AS blob_id,
    resources.iri AS resource,
    blobs.codec AS codec,
    blobs.multihash AS multihash
FROM drafts
JOIN resources ON resources.id = drafts.resource
JOIN blobs INDEXED BY blobs_metadata ON blobs.id = drafts.blob;

-- View for dependency links between changes.
CREATE VIEW change_deps AS
SELECT
    source AS child,
    target AS parent
FROM blob_links
WHERE type = 'change/dep';

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

-- Stores data for syncing groups that are known to be published to a site.
CREATE TABLE group_sites (
    group_id TEXT NOT NULL,
    url TEXT NOT NULL,
    hlc_time INTEGER NOT NULL,
    hlc_origin TEXT NOT NULL,
    -- Bellow this line are cached/derived values.
    remote_version TEXT NOT NULL DEFAULT (''),
    last_sync_time INTEGER NOT NULL DEFAULT (0),
    last_ok_sync_time INTEGER NOT NULL DEFAULT (0),
    last_sync_error TEXT NOT NULL DEFAULT (''),
    PRIMARY KEY (group_id)
);

-- Stores offset cursors for syncing all blobs with peers.
CREATE TABLE syncing_cursors (
    peer INTEGER PRIMARY KEY REFERENCES public_keys (id) ON DELETE CASCADE NOT NULL,
    cursor TEXT NOT NULL
) WITHOUT ROWID;
