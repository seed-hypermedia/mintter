// Package activity manages the activity feed.
package activity

import (
	context "context"
	"encoding/base64"
	"fmt"
	"math"
	"mintter/backend/core"
	activity "mintter/backend/genproto/activity/v1alpha"
	"mintter/backend/pkg/dqb"
	"mintter/backend/pkg/future"
	"strconv"
	"time"

	"github.com/ipfs/go-cid"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Repo is a subset of the [ondisk.OnDisk] used by this server.
type Repo interface {
	Device() core.KeyPair
	Identity() *future.ReadOnly[core.Identity]
	CommitAccount(core.PublicKey) error
}

// Server implements the Activity gRPC API.
type Server struct {
	me        *future.ReadOnly[core.Identity]
	db        *sqlitex.Pool
	startTime time.Time
}

// NewServer creates a new Server.
func NewServer(id *future.ReadOnly[core.Identity], db *sqlitex.Pool) *Server {
	return &Server{
		db:        db,
		startTime: time.Now(),
		me:        id,
	}
}

// ListEvents list all the events seen locally.
func (srv *Server) ListEvents(ctx context.Context, req *activity.ListEventsRequest) (*activity.ListEventsResponse, error) {
	me, ok := srv.me.Get()
	if !ok {
		return nil, fmt.Errorf("account is not initialized yet")
	}
	var cursorBlobID int64 = math.MaxInt32
	var err error
	if req.PageToken != "" {
		pageTokenBytes, _ := base64.StdEncoding.DecodeString(req.PageToken)
		if err != nil {
			return nil, fmt.Errorf("Token encoding not valid: %w", err)
		}
		clearPageToken, err := me.DeviceKey().Decrypt(pageTokenBytes)
		if err != nil {
			return nil, fmt.Errorf("Token not valid: %w", err)
		}
		pageToken, err := strconv.ParseUint(string(clearPageToken), 10, 32)
		if err != nil {
			return nil, fmt.Errorf("Token not valid: %w", err)
		}
		cursorBlobID = int64(pageToken)
	}
	conn, cancel, err := srv.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer cancel()

	var events []*activity.Event

	var qGetEventsTrusted = dqb.Str(`
		SELECT blobs.id, structural_blobs.type ,public_keys.principal, resources.iri, structural_blobs.ts, blobs.insert_time, blobs.multihash, blobs.codec
		FROM structural_blobs 
		JOIN blobs ON blobs.id=structural_blobs.id 
		JOIN public_keys ON structural_blobs.author=public_keys.id
		LEFT JOIN resources ON structural_blobs.resource=resources.id
		JOIN trusted_accounts ON trusted_accounts.id=public_keys.id
		WHERE blobs.id <= :idx AND (resources.iri NOT IN (SELECT resource from drafts_view) OR resources.iri IS NULL) ORDER BY blobs.id desc limit :page_token;
	`)
	var qGetEventsAll = dqb.Str(`
		SELECT blobs.id, structural_blobs.type ,public_keys.principal, resources.iri, structural_blobs.ts, blobs.insert_time, blobs.multihash, blobs.codec
		FROM structural_blobs 
		JOIN blobs ON blobs.id=structural_blobs.id 
		JOIN public_keys ON structural_blobs.author=public_keys.id
		LEFT JOIN resources ON structural_blobs.resource=resources.id
		WHERE blobs.id <= :idx AND (resources.iri NOT IN (SELECT resource from drafts_view) OR resources.iri IS NULL) ORDER BY blobs.id desc limit :page_token;
	`)
	query := qGetEventsAll()
	if req.TrustedOnly {
		query = qGetEventsTrusted()
	}
	var lastBlobID int64
	err = sqlitex.Exec(conn, query, func(stmt *sqlite.Stmt) error {
		lastBlobID = stmt.ColumnInt64(0)
		eventType := stmt.ColumnText(1)
		author := stmt.ColumnBytes(2)
		resource := stmt.ColumnText(3)
		eventTime := stmt.ColumnInt64(4) * 1000 //Its in microseconds and we need nanos
		observeTime := stmt.ColumnInt64(5)
		mhash := stmt.ColumnBytes(6)
		codec := stmt.ColumnInt64(7)
		accountID := core.Principal(author).String()
		id := cid.NewCidV1(uint64(codec), mhash)
		if eventType == "Comment" {
			resource = "hm://c/" + id.String()
		}
		event := activity.Event{
			Data: &activity.Event_NewBlob{NewBlob: &activity.NewBlobEvent{
				Cid:      id.String(),
				BlobType: eventType,
				Author:   accountID,
				Resource: resource,
			}},
			Account:     accountID,
			EventTime:   &timestamppb.Timestamp{Seconds: eventTime / 1000000000, Nanos: int32(eventTime % 1000000000)},
			ObserveTime: &timestamppb.Timestamp{Seconds: observeTime},
		}
		events = append(events, &event)
		return nil
	}, cursorBlobID, req.PageSize)
	if err != nil {
		return nil, fmt.Errorf("Problem collecting activity feed, Probably no feed or token out of range: %w", err)
	}
	var PageTokenStr string

	pageToken, err := me.DeviceKey().Encrypt([]byte(strconv.Itoa(int(lastBlobID - 1))))
	if err != nil {
		return nil, err
	}
	if lastBlobID != 0 && req.PageSize == int32(len(events)) {
		PageTokenStr = base64.StdEncoding.EncodeToString(pageToken)
	}
	return &activity.ListEventsResponse{
		Events:        events,
		NextPageToken: PageTokenStr,
	}, err
}
