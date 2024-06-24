// Package activity manages the activity feed.
package activity

import (
	context "context"
	"encoding/hex"
	"fmt"
	"math"
	"regexp"
	"seed/backend/core"
	"seed/backend/daemon/apiutil"
	"seed/backend/daemon/storage"
	activity "seed/backend/genproto/activity/v1alpha"
	"seed/backend/pkg/dqb"
	"strings"
	"time"

	"github.com/ipfs/go-cid"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"
)

var resourcePattern = regexp.MustCompile(`^hm://[acdg]/[a-zA-Z0-9]+$`)

// Server implements the Activity gRPC API.
type Server struct {
	db        *sqlitex.Pool
	startTime time.Time
}

// NewServer creates a new Server.
func NewServer(db *sqlitex.Pool) *Server {
	return &Server{
		db:        db,
		startTime: time.Now(),
	}
}

// RegisterServer registers the server with the gRPC server.
func (srv *Server) RegisterServer(rpc grpc.ServiceRegistrar) {
	activity.RegisterActivityFeedServer(rpc, srv)
}

// ListEvents list all the events seen locally.
func (srv *Server) ListEvents(ctx context.Context, req *activity.ListEventsRequest) (*activity.ListEventsResponse, error) {
	var cursorBlobID int64 = math.MaxInt32
	if req.PageToken != "" {
		if err := apiutil.DecodePageToken(req.PageToken, &cursorBlobID, nil); err != nil {
			return nil, fmt.Errorf("failed to decode page token: %w", err)
		}
	}
	conn, cancel, err := srv.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer cancel()

	var events []*activity.Event

	var trustedStr string
	if req.TrustedOnly {
		trustedStr = "JOIN " + storage.TrustedAccounts.String() + " ON " + storage.TrustedAccountsID.String() + "=" + storage.PublicKeysID.String()
	}
	var filtersStr string
	if len(req.FilterUsers) > 0 {
		filtersStr = storage.PublicKeysPrincipal.String() + " in ("
		for i, user := range req.FilterUsers {
			if i > 0 {
				filtersStr += ", "
			}
			principal, err := core.DecodePrincipal(user)
			if err != nil {
				return nil, fmt.Errorf("Invalid user filter [%s]: %w", user, err)
			}
			filtersStr += "unhex('" + strings.ToUpper(hex.EncodeToString(principal)) + "')"
		}
		filtersStr += ") AND "
	}

	if len(req.FilterEventType) > 0 {
		filtersStr += "lower(" + storage.StructuralBlobsType.String() + ") in ("
		for i, eventType := range req.FilterEventType {
			// Hardcode this to prevent injection attacks
			if strings.ToLower(eventType) != "keydelegation" && strings.ToLower(eventType) != "change" && strings.ToLower(eventType) != "comment" && strings.ToLower(eventType) != "dagpb" {
				return nil, fmt.Errorf("Invalid event type filter [%s]: Only KeyDelegation | Change | Comment | DagPB aresupported at the moment", eventType)
			}
			if i > 0 {
				filtersStr += ", "
			}
			filtersStr += "'" + strings.ToLower(eventType) + "'"
		}
		filtersStr += ") AND "
	}
	if len(req.FilterResource) > 0 {
		filtersStr += storage.ResourcesIRI.String() + " in ("
		for i, resource := range req.FilterResource {
			if !resourcePattern.MatchString(resource) {
				return nil, fmt.Errorf("Invalid resource format [%s]", resource)
			}
			if i > 0 {
				filtersStr += ", "
			}
			filtersStr += "'" + resource + "'"
		}
		filtersStr += ") AND "
	}
	var linksStr string
	if len(req.AddLinkedResource) > 0 {
		if len(req.FilterResource) > 0 || len(req.FilterEventType) > 0 {
			linksStr += " OR "
		}
		linksStr += "(" + storage.StructuralBlobsType.String() + " in ('Change', 'Comment') AND " + storage.ResourceLinksTarget.String() + " IN (" +
			"select " + storage.ResourcesID.String() + " FROM " + storage.T_Resources + " where " + storage.ResourcesIRI.String() + " in ("
		for i, resource := range req.AddLinkedResource {
			if !resourcePattern.MatchString(resource) {
				return nil, fmt.Errorf("Invalid link resource format [%s]", resource)
			}
			if i > 0 {
				linksStr += ", "
			}
			linksStr += "'" + resource + "'"
		}
		linksStr += "))) AND "
	}
	var (
		selectStr            = "SELECT distinct " + storage.BlobsID + ", " + storage.StructuralBlobsType + ", " + storage.PublicKeysPrincipal + ", " + storage.ResourcesIRI + ", " + storage.StructuralBlobsTs + ", " + storage.BlobsInsertTime + ", " + storage.BlobsMultihash + ", " + storage.BlobsCodec
		tableStr             = "FROM " + storage.T_StructuralBlobs
		joinIDStr            = "JOIN " + storage.Blobs.String() + " ON " + storage.BlobsID.String() + "=" + storage.StructuralBlobsID.String()
		joinpkStr            = "JOIN " + storage.PublicKeys.String() + " ON " + storage.StructuralBlobsAuthor.String() + "=" + storage.PublicKeysID.String()
		joinLinksStr         = "LEFT JOIN " + storage.ResourceLinks.String() + " ON " + storage.StructuralBlobsID.String() + "=" + storage.ResourceLinksSource.String()
		leftjoinResourcesStr = "LEFT JOIN " + storage.Resources.String() + " ON " + storage.StructuralBlobsResource.String() + "=" + storage.ResourcesID.String()

		pageTokenStr = storage.BlobsID.String() + " <= :idx AND (" + storage.ResourcesIRI.String() + " NOT IN (SELECT " + storage.DraftsViewResource.String() + " from " + storage.DraftsView.String() + ") OR " + storage.ResourcesIRI.String() + " IS NULL) AND " + storage.BlobsSize.String() + ">0 ORDER BY " + storage.BlobsID.String() + " desc limit :page_size"
	)

	var getEventsStr = fmt.Sprintf(`
		%s
		%s
		%s
		%s
		%s
		%s
		%s
		WHERE %s %s %s;
	`, selectStr, tableStr, joinIDStr, joinpkStr, joinLinksStr, leftjoinResourcesStr, trustedStr, filtersStr, linksStr, pageTokenStr)
	var lastBlobID int64
	err = sqlitex.Exec(conn, dqb.Str(getEventsStr)(), func(stmt *sqlite.Stmt) error {
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

	var nextPageToken string
	if lastBlobID != 0 && req.PageSize == int32(len(events)) {
		nextPageToken, err = apiutil.EncodePageToken(lastBlobID-1, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to encode next page token: %w", err)
		}
	}

	return &activity.ListEventsResponse{
		Events:        events,
		NextPageToken: nextPageToken,
	}, err
}
