// Package activity manages the activity feed.
package activity

import (
	context "context"
	"fmt"
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
	db            *sqlitex.Pool
	startTime     time.Time
	NextPageToken string
}

// NewServer creates a new Server.
func NewServer(db *sqlitex.Pool) *Server {
	return &Server{
		db:        db,
		startTime: time.Now(),
	}
}

// ListEvents list all the events seen locally.
func (srv *Server) ListEvents(ctx context.Context, req *activity.ListEventsRequest) (*activity.ListEventsResponse, error) {
	var token uint64
	var err error
	if req.PageToken != "" {
		token, err = strconv.ParseUint(req.PageToken, 10, 32)
		if err != nil {
			return nil, fmt.Errorf("Token not valid: %w", err)
		}
	}
	fmt.Println(token)
	conn, cancel, err := srv.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer cancel()

	var events []*activity.Event

	var qGetEventsTrusted = dqb.Str(`
		SELECT structural_blobs.type ,public_keys.principal, resources.iri, structural_blobs.ts, blobs.insert_time, blobs.multihash, blobs.codec
		FROM structural_blobs 
		JOIN blobs ON blobs.id=structural_blobs.id 
		JOIN public_keys ON structural_blobs.author=public_keys.id
		JOIN resources ON structural_blobs.resource=resources.id
		JOIN trusted_accounts ON trusted_accounts.id=public_keys.id
		ORDER BY blobs.id desc limit ?;
	`)
	var qGetEventsAll = dqb.Str(`
		SELECT structural_blobs.type ,public_keys.principal, resources.iri, structural_blobs.ts, blobs.insert_time, blobs.multihash, blobs.codec
		FROM structural_blobs 
		JOIN blobs ON blobs.id=structural_blobs.id 
		JOIN public_keys ON structural_blobs.author=public_keys.id
		JOIN resources ON structural_blobs.resource=resources.id
		ORDER BY blobs.id desc limit ?;
	`)
	query := qGetEventsAll()
	if req.TrustedOnly {
		query = qGetEventsTrusted()
	}
	err = sqlitex.Exec(conn, query, func(stmt *sqlite.Stmt) error {
		eventType := stmt.ColumnText(0)
		author := stmt.ColumnBytes(1)
		resource := stmt.ColumnText(2)
		eventTime := stmt.ColumnInt64(3) * 1000 //Its in microseconds and we need nanos
		observeTime := stmt.ColumnInt64(4)
		mhash := stmt.ColumnBytes(5)
		codec := stmt.ColumnInt64(6)
		accountID := core.Principal(author).String()
		id := cid.NewCidV1(uint64(codec), mhash)

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
	}, req.PageSize)
	var pageSize int32 = 20
	if req.PageSize != 0 {
		pageSize = req.PageSize
	}
	var nextToken string
	if pageSize < int32(len(events)) {
		nextToken = strconv.Itoa(len(events))
	}
	return &activity.ListEventsResponse{
		Events:        events,
		NextPageToken: nextToken,
	}, err

}
