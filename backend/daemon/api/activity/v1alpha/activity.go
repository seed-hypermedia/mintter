// Package activity manages the activity feed.
package activity

import (
	context "context"
	"mintter/backend/core"
	activity "mintter/backend/genproto/activity/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/pkg/future"
	sync "sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Repo is a subset of the [ondisk.OnDisk] used by this server.
type Repo interface {
	Device() core.KeyPair
	Identity() *future.ReadOnly[core.Identity]
	CommitAccount(core.PublicKey) error
}

// Server implements the Activity gRPC API.
type Server struct {
	blobs     *hyper.Storage
	repo      Repo
	startTime time.Time
	mu        sync.Mutex // we only want one register request at a time.
}

// NewServer creates a new Server.
func NewServer(r Repo, blobs *hyper.Storage) *Server {
	return &Server{
		blobs:     blobs,
		repo:      r,
		startTime: time.Now(),
	}
}

// ListEvents list all the events seen locally.
func (srv *Server) ListEvents(ctx context.Context, req *activity.ListEventsRequest) (*activity.ListEventsResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "Hold on Eric. API not ready yet")
}
