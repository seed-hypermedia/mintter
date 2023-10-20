package groups

import (
	"context"
	"fmt"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/pkg/dqb"
	"mintter/backend/pkg/errutil"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
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
func (db *DB) RecordGroupSiteSync(ctx context.Context, group string, now time.Time, syncErr error, info *groups.PublicSiteInfo) error {
	conn, release, err := db.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	nowts := now.Unix()

	var errmsg string
	if syncErr != nil {
		errmsg = syncErr.Error()
	}

	var remoteVersion string
	if info != nil {
		remoteVersion = info.GroupVersion
	}

	if err := sqlitex.Exec(conn, qRecordGroupSiteSync(), nil, errmsg, remoteVersion, nowts, group); err != nil {
		return err
	}

	if conn.Changes() == 0 {
		return fmt.Errorf("group site %s couldn't update: not found", group)
	}

	return nil
}

var qRecordGroupSiteSync = dqb.Str(`
	UPDATE group_sites SET
		remote_version = iif(:err != '', remote_version, :remote_version),
		last_sync_time = :now,
		last_ok_sync_time = iif(:err != '', last_ok_sync_time, :now),
		last_sync_error = :err
	WHERE group_id = :group_id;
`)

type groupSite struct {
	GroupID        string
	URL            string
	RemoteVersion  string
	LastSyncTime   int64
	LastOKSyncTime int64
	LastSyncError  string
}

// GetGroupSite returns the site record.
func (db *DB) GetGroupSite(ctx context.Context, groupID string) (sr groupSite, err error) {
	return sr, db.queryOne(ctx, qGetSite(), []any{groupID}, []any{
		&sr.GroupID,
		&sr.URL,
		&sr.RemoteVersion,
		&sr.LastSyncTime,
		&sr.LastOKSyncTime,
		&sr.LastSyncError,
	})
}

var qGetSite = dqb.Str(`
	SELECT
		group_id,
		url,
		remote_version,
		last_sync_time,
		last_ok_sync_time,
		last_sync_error
	FROM group_sites
	WHERE group_id = :group_id;
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

/*
group_blobs = group_changes + transitive blobs
+
for each group_blob get attrs with resource values and no extra->v
+


*/

var qCollectBlobs = dqb.Str(`
	WITH RECURSIVE
		group_blobs (blob) AS (
			SELECT blob
			FROM blob_attrs
			WHERE key = 'resource/id'
			AND value_ptr IS NOT NULL AND value_ptr = :group
			-- Get changes for documents linked without version.
			UNION 
			SELECT changes.blob
			FROM group_blobs
			JOIN blob_attrs
				ON blob_attrs.blob = group_blobs.blob
				AND blob_attrs.key = 'group/content'
				AND blob_attrs.extra->'v' IS NULL
				AND blob_attrs.value_ptr IS NOT NULL
			JOIN changes ON changes.entity = blob_attrs.value_ptr
			-- Get changes for authors
			UNION
			SELECT changes.blob
			FROM group_blobs
			JOIN blob_attrs
				ON blob_attrs.blob = group_blobs.blob
				AND blob_attrs.key = 'group/member'
				AND blob_attrs.value_ptr IS NOT NULL
			JOIN accounts ON accounts.public_key = blob_attrs.value_ptr
			JOIN changes ON changes.entity = accounts.entity
			-- Get blob links.
			UNION
			SELECT blob_links.target
			FROM group_blobs
			JOIN blob_links ON blob_links.source = group_blobs.blob
		)
	SELECT
		blobs.id AS id,
		blobs.codec AS codec,
		blobs.multihash AS multihash
	FROM group_blobs
	JOIN blobs ON blobs.id = group_blobs.blob
	ORDER BY blobs.id ASC;
`)

// ListSites returns the list of sites we know about.
func (db *DB) ListSiteGroups(ctx context.Context) ([]string, error) {
	conn, release, err := db.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var groups []string

	if err := sqlitex.Exec(conn, qListSiteGroups(), func(stmt *sqlite.Stmt) error {
		var group string
		stmt.Scan(&group)
		groups = append(groups, group)
		return nil
	}); err != nil {
		return nil, err
	}

	return groups, nil
}

var qListSiteGroups = dqb.Str(`
	SELECT group_id
	FROM group_sites;
`)

func (db *DB) queryOne(ctx context.Context, sql string, args []any, outs []any) error {
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
		return errutil.NotFound("expected one record but got %d", count)
	}

	return nil
}
