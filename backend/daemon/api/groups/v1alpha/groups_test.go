package groups

import (
	"context"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/daemon/storage"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/pkg/future"
	"mintter/backend/testutil"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

var _ groups.GroupsServer = (*Server)(nil)

func TestCreateGroup(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	start := time.Now().Add(-1 * 40 * time.Second)

	group, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	require.Equal(t, "My Group", group.Title)
	require.Equal(t, "Description of my group", group.Description)
	require.Equal(t, srv.me.MustGet().Account().Principal().String(), group.OwnerAccountId)
	require.True(t, group.CreateTime.AsTime().After(start), "group create time must be after start")
	require.NotEqual(t, "", group.Version, "group version must not be empty")
}

func TestGetGroup(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	group, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	group2, err := srv.GetGroup(ctx, &groups.GetGroupRequest{
		Id: group.Id,
	})
	require.NoError(t, err)
	testutil.ProtoEqual(t, group, group2, "get group must return the same group after creation")
}

func TestUpdateGroup(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	group, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	group2, err := srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id:    group.Id,
		Title: "My Group 2",
	})

	require.NoError(t, err)
	require.Equal(t, "My Group 2", group2.Title)
	require.Equal(t, "", group2.Description)
}

func TestGetGroupWithVersion(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	group, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	group2, err := srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id:          group.Id,
		Title:       "My Group 2",
		Description: "Description of my group 2",
	})
	require.NoError(t, err)

	got, err := srv.GetGroup(ctx, &groups.GetGroupRequest{
		Id: group.Id,
	})
	require.NoError(t, err)
	testutil.ProtoEqual(t, group2, got, "get group without version must return the latest group")

	got, err = srv.GetGroup(ctx, &groups.GetGroupRequest{
		Id:      group.Id,
		Version: group.Version,
	})
	require.NoError(t, err)
	testutil.ProtoEqual(t, group, got, "get group with version must return the group at that version")
}

func TestListContent(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	group, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	group, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group.Id,
		UpdatedContent: map[string]string{
			"/": "hd://d/my-index-page?v=deadbeef",
		},
	})
	require.NoError(t, err)

	{
		content, err := srv.ListContent(ctx, &groups.ListContentRequest{
			Id: group.Id,
		})
		require.NoError(t, err)

		want := &groups.ListContentResponse{
			Content: map[string]string{
				"/": "hd://d/my-index-page?v=deadbeef",
			},
		}

		testutil.ProtoEqual(t, want, content, "list content response must match")
	}

	old := group

	{
		group, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
			Id: group.Id,
			UpdatedContent: map[string]string{
				"/":   "",
				"foo": "bar",
			},
		})
		require.NoError(t, err)

		content, err := srv.ListContent(ctx, &groups.ListContentRequest{
			Id: group.Id,
		})
		require.NoError(t, err)

		want := &groups.ListContentResponse{
			Content: map[string]string{
				"/":   "",
				"foo": "bar",
			},
		}

		testutil.ProtoEqual(t, want, content, "list content response must match")
	}

	// Getting content for old group version.
	{
		group, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
			Id: group.Id,
			UpdatedContent: map[string]string{
				"/":   "",
				"foo": "bar",
			},
		})
		require.NoError(t, err)

		content, err := srv.ListContent(ctx, &groups.ListContentRequest{
			Id:      group.Id,
			Version: old.Version,
		})
		require.NoError(t, err)

		want := &groups.ListContentResponse{
			Content: map[string]string{
				"/": "hd://d/my-index-page?v=deadbeef",
			},
		}

		testutil.ProtoEqual(t, want, content, "list content response must match")
	}
}

func TestListGroups(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	g1, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	g2, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group 2",
		Description: "Description of my group 2",
	})
	require.NoError(t, err)

	g3, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group 3",
		Description: "Description of my group 3",
	})
	require.NoError(t, err)

	list, err := srv.ListGroups(ctx, &groups.ListGroupsRequest{})
	require.NoError(t, err)

	want := &groups.ListGroupsResponse{
		Groups: []*groups.Group{
			g1,
			g2,
			g3,
		},
	}

	testutil.ProtoEqual(t, want, list, "list groups response must match")
}

func newTestSrv(t *testing.T, name string) *Server {
	u := coretest.NewTester("alice")

	db := storage.MakeTestDB(t)

	fut := future.New[core.Identity]()
	require.NoError(t, fut.Resolve(u.Identity))

	bs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	srv := NewServer(fut.ReadOnly, bs)

	_, err := daemon.Register(context.Background(), bs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	_, err = srv.me.Await(context.Background())
	require.NoError(t, err)

	return srv
}
