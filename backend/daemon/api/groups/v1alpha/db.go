package groups

import (
	"context"
	"fmt"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/pkg/dqb"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// DB is a database for storing sites.
type DB struct {
	db *sqlitex.Pool
}

// NewSQLiteDB creates a new DB backed by a SQLite connection pool.
func NewSQLiteDB(db *sqlitex.Pool) *DB {
	return &DB{db: db}
}

// RecordSiteSync updates the last sync time of a site.
func (db *DB) RecordSiteSync(ctx context.Context, baseURL string, pid peer.ID, now time.Time, ok bool) error {
	conn, release, err := db.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	nowts := now.Unix()

	if err := sqlitex.Exec(conn, qRecordSiteSync(), nil, pid.String(), nowts, ok, baseURL); err != nil {
		return err
	}

	if conn.Changes() == 0 {
		return fmt.Errorf("site %s not found", baseURL)
	}

	return nil
}

var qRecordSiteSync = dqb.Str(`
	UPDATE remote_sites SET
		peer_id = :pid,
		last_sync_time = :now,
		last_ok_sync_time = iif(:ok = 1, :now, last_ok_sync_time)
	WHERE url = :url;
`)

type siteRecord struct {
	URL            string
	PeerID         string
	GroupID        string
	GroupVersion   string
	LastSyncTime   int64
	LastSyncOkTime int64
}

// GetSite returns the site record.
func (db *DB) GetSite(ctx context.Context, baseURL string) (sr siteRecord, err error) {
	return sr, db.QueryOne(ctx, qGetSite(), []any{baseURL}, []any{
		&sr.URL,
		&sr.PeerID,
		&sr.GroupID,
		&sr.GroupVersion,
		&sr.LastSyncTime,
		&sr.LastSyncOkTime,
	})
}

var qGetSite = dqb.Str(`
	SELECT
		url,
		peer_id,
		group_id,
		group_version,
		last_sync_time,
		last_ok_sync_time
	FROM remote_sites
	WHERE url = :url;
`)

// ForEachRelatedBlob collects all the related blobs for a given group and calls fn on each CID.
func (db *DB) ForEachRelatedBlob(ctx context.Context, group hyper.EntityID, fn func(c cid.Cid) error) error {
	conn, release, err := db.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	gdb, err := hypersql.EntitiesLookupID(conn, string(group))
	if err != nil {
		return err
	}
	if gdb.EntitiesID == 0 {
		return status.Errorf(codes.NotFound, "group %s not found", group)
	}

	return sqlitex.Exec(conn, qCollectBlobs(), func(stmt *sqlite.Stmt) error {
		var (
			id        int64
			codec     int64
			multihash []byte
		)
		stmt.Scan(&id, &codec, &multihash)

		c := cid.NewCidV1(uint64(codec), multihash)
		return fn(c)
	}, gdb.EntitiesID)
}

var qCollectBlobs = dqb.Str(`
	WITH RECURSIVE
		group_blobs (blob) AS (
			SELECT blob
			FROM changes
			WHERE entity = :group
			UNION
			SELECT blob_links.target
			FROM blob_links, group_blobs
			WHERE blob_links.source = group_blobs.blob
		),
		account_entities (entity) AS (
			SELECT DISTINCT accounts.entity
			FROM group_blobs
			JOIN changes ON changes.blob = group_blobs.blob
			JOIN accounts ON accounts.entity = changes.entity
		),
		account_blobs (blob) AS (
			SELECT changes.blob
			FROM account_entities
			JOIN changes ON changes.entity = account_entities.entity
			UNION
			SELECT blob_links.target
			FROM account_blobs
			JOIN blob_links ON blob_links.source = account_blobs.blob
		),
		all_blobs (blob) AS (
			SELECT blob FROM group_blobs
			UNION
			SELECT blob FROM account_blobs
		)
	SELECT
		blobs.id AS id,
		blobs.codec AS codec,
		blobs.multihash AS multihash
	FROM all_blobs
	JOIN blobs ON blobs.id = all_blobs.blob
	ORDER BY blobs.id ASC;
`)

func (db *DB) QueryOne(ctx context.Context, sql string, args []any, outs []any) error {
	conn, release, err := db.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	var count int

	if err := sqlitex.Exec(conn, sql, func(stmt *sqlite.Stmt) error {
		count++
		stmt.Scan(outs...)
		return nil
	}, args...); err != nil {
		return err
	}

	if count == 0 {
		return fmt.Errorf("not found")
	}

	if count > 1 {
		return fmt.Errorf("expected one record but got %d", count)
	}

	return nil
}
