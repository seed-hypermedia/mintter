package groups

import (
	"context"
	"fmt"
	groups "seed/backend/genproto/groups/v1alpha"
	"seed/backend/hyper"
	"seed/backend/hyper/hypersql"
	"seed/backend/pkg/dqb"
	"seed/backend/pkg/errutil"
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

// RecordGroupSiteSync updates the last sync time of a site.
func (db *DB) RecordGroupSiteSync(ctx context.Context, group string, now time.Time, syncErr error, info *groups.PublicSiteInfo) error {
	nowts := now.Unix()

	var errmsg string
	if syncErr != nil {
		errmsg = syncErr.Error()
	}

	var remoteVersion string
	if info != nil {
		remoteVersion = info.GroupVersion
	}

	return db.db.WithTx(ctx, func(conn *sqlite.Conn) error {
		if err := sqlitex.Exec(conn, qRecordGroupSiteSync(), nil, errmsg, remoteVersion, nowts, group); err != nil {
			return err
		}

		if conn.Changes() == 0 {
			return fmt.Errorf("group site %s couldn't update: not found", group)
		}

		return nil
	})
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
	if gdb.ResourcesID == 0 {
		return status.Errorf(codes.NotFound, "group %s not found", group)
	}

	return sqlitex.Exec(conn, QCollectBlobs(), func(stmt *sqlite.Stmt) error {
		var (
			id        int64
			codec     int64
			multihash []byte
		)
		stmt.Scan(&id, &codec, &multihash)

		c := cid.NewCidV1(uint64(codec), multihash)
		return fn(c)
	}, gdb.ResourcesID)
}

// The goal of this query is to collect all the blobs that belong to the resource,
// and collect all the linked blobs from referenced resources.
// The complexity comes from the fact that some links are unpinned, so we need to collect
// all the blobs we know from the referenced resource.
// This is one of those cases where imperative code would probably be more clear than the declarative SQL.
// The logic of this query is roughly expressed by pseudocode as:
//
//	# Kind 0 means Resource.
//	# Kind 1 means Blob.
//	enqueue(:group, kind=0)
//	for item in queue.pop():
//	    if item is visited:
//	        continue
//	    if item.kind == 0:
//	        # Enqueue all the blobs of the given resource.
//	        for blob in item.resource:
//	            enqueue(blob, kind=1)
//	    if item.kind == 1:
//	        for blob_link in item.blob.links:
//	            enqueue(blob_links.target, kind=1)
//	        for resource_link in item.blob.resource_links:
//	            # We don't care about pinned links,
//	            # because they would be already covered
//	            # by blob_links above.
//	            if resource_link.is_pinned:
//	                continue
//	            enqueue(resource_link.target, kind=0)
var QCollectBlobs = dqb.Str(`
	WITH RECURSIVE selected (id, kind) AS (
		SELECT :group, 0
		UNION
		SELECT blob_links.target, 1
		FROM selected
		JOIN blob_links ON blob_links.source = selected.id AND selected.kind = 1
		UNION
		SELECT resource_links.target, 0
		FROM selected
		JOIN resource_links ON resource_links.source = selected.id
			AND selected.kind = 1
			AND resource_links.is_pinned = 0
		UNION
		SELECT structural_blobs.id, 1
		FROM selected
		JOIN structural_blobs ON structural_blobs.resource = selected.id
			AND selected.kind = 0
	)
	SELECT
		blobs.id,
		blobs.codec,
		blobs.multihash
	FROM selected
	JOIN blobs INDEXED BY blobs_metadata ON blobs.id = selected.id AND selected.kind = 1
	ORDER BY blobs.id;
`)

// ListSiteGroups returns the list of sites we know about.
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
