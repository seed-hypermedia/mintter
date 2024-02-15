package activity

import (
	context "context"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	"mintter/backend/daemon/storage"
	activity "mintter/backend/genproto/activity/v1alpha"
	"mintter/backend/pkg/future"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestListEvents(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	req := &activity.ListEventsRequest{
		PageSize:  5,
		PageToken: "",
	}
	events, err := alice.ListEvents(ctx, req)
	require.NoError(t, err)
	require.NotNil(t, events)
	require.Len(t, events.Events, 0)
}

// TODO: update profile idempotent no change

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)
	//repo := daemontest.MakeTestRepo(t, u)
	db := storage.MakeTestDB(t)
	//blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	fut := future.New[core.Identity]()
	require.NoError(t, fut.Resolve(u.Identity))

	return NewServer(fut.ReadOnly, db)
}
