package groups

import (
	"context"
	"seed/backend/core"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	groups "seed/backend/genproto/groups/v1alpha"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/mttnet"
	"seed/backend/pkg/future"
	"seed/backend/testutil"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/wrapperspb"
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
		Id:          group.Id,
		Title:       "My Group 2",
		Description: wrapperspb.String(""),
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
		Description: wrapperspb.String("Description of my group 2"),
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
			"/": "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw",
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
				"/": "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw",
			},
		}

		testutil.ProtoEqual(t, want, content, "list content response must match")
	}

	old := group

	{
		group, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
			Id: group.Id,
			UpdatedContent: map[string]string{
				"/":    "",
				"/foo": "bar",
			},
		})
		require.NoError(t, err)

		content, err := srv.ListContent(ctx, &groups.ListContentRequest{
			Id: group.Id,
		})
		require.NoError(t, err)

		want := &groups.ListContentResponse{
			Content: map[string]string{
				"/":    "",
				"/foo": "bar",
			},
		}

		testutil.ProtoEqual(t, want, content, "list content response must match")
	}

	// Getting content for old group version.
	{
		content, err := srv.ListContent(ctx, &groups.ListContentRequest{
			Id:      group.Id,
			Version: old.Version,
		})
		require.NoError(t, err)

		want := &groups.ListContentResponse{
			Content: map[string]string{
				"/": "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw",
			},
		}

		testutil.ProtoEqual(t, want, content, "list content response must match")
	}
}

func TestMembers(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	bob := coretest.NewTester("bob")
	// carol := coretest.NewTester("carol")
	ctx := context.Background()

	group, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title: "My Group",
	})
	require.NoError(t, err)

	_, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group.Id,
		UpdatedMembers: map[string]groups.Role{
			bob.Account.Principal().String(): groups.Role_EDITOR,
		},
	})
	require.NoError(t, err)

	list, err := srv.ListMembers(ctx, &groups.ListMembersRequest{Id: group.Id})
	require.NoError(t, err)
	want := &groups.ListMembersResponse{
		OwnerAccountId: srv.me.MustGet().Account().Principal().String(),
		Members: map[string]groups.Role{
			srv.me.MustGet().Account().Principal().String(): groups.Role_OWNER,
			bob.Account.Principal().String():                groups.Role_EDITOR,
		},
	}
	testutil.ProtoEqual(t, want, list, "list members response must match")

	// TODO(burdiyan): uncomment this when removing members is implemented.
	// _, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
	// 	Id: group.Id,
	// 	UpdatedMembers: map[string]groups.Role{
	// 		bob.Account.Principal().String():   groups.Role_ROLE_UNSPECIFIED,
	// 		carol.Account.Principal().String(): groups.Role_EDITOR,
	// 	},
	// })
	// require.NoError(t, err)

	// list, err = srv.ListMembers(ctx, &groups.ListMembersRequest{Id: group.Id})
	// require.NoError(t, err)
	// want = &groups.ListMembersResponse{
	// 	OwnerAccountId: srv.me.MustGet().Account().Principal().String(),
	// 	Members:        map[string]groups.Role{carol.Account.Principal().String(): groups.Role_EDITOR},
	// }
	// testutil.ProtoEqual(t, want, list, "list members response must match")
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

func TestDocumentGroupBacklinks(t *testing.T) {
	t.Parallel()

	srv := newTestSrv(t, "alice")
	ctx := context.Background()

	group1, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title:       "My Group",
		Description: "Description of my group",
	})
	require.NoError(t, err)

	group1, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group1.Id,
		UpdatedContent: map[string]string{
			"/": "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw",
		},
	})
	require.NoError(t, err)

	group2, err := srv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title: "My another Group",
	})
	require.NoError(t, err)

	group2, err = srv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group2.Id,
		UpdatedContent: map[string]string{
			"/fragmented-document": "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw#some-fragment",
		},
	})
	require.NoError(t, err)

	list, err := srv.ListDocumentGroups(ctx, &groups.ListDocumentGroupsRequest{
		DocumentId: "hm://d/my-index-page",
	})
	require.NoError(t, err)

	want := &groups.ListDocumentGroupsResponse{
		Items: []*groups.ListDocumentGroupsResponse_Item{
			{
				GroupId:    group1.Id,
				ChangeId:   group1.Version,
				ChangeTime: group1.UpdateTime,
				Path:       "/",
				RawUrl:     "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw",
			},
			{
				GroupId:    group2.Id,
				ChangeId:   group2.Version,
				ChangeTime: group2.UpdateTime,
				Path:       "/fragmented-document",
				RawUrl:     "hm://d/my-index-page?v=bafy2bzacectq4c4akk6bmlrdem6hzf5blrmnnj2sptedtd5t5hp6ggkky3tlw#some-fragment",
			},
		},
	}

	testutil.ProtoEqual(t, want, list, "list groups for document response must match")
}

func TestListAccountGroups(t *testing.T) {
	t.Parallel()

	alicesrv := newTestSrv(t, "alice")
	alice := alicesrv.me.MustGet()
	bob := coretest.NewTester("bob")
	carol := coretest.NewTester("carol")
	ctx := context.Background()

	group1, err := alicesrv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title: "My Group",
	})
	require.NoError(t, err)

	group1, err = alicesrv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group1.Id,
		UpdatedMembers: map[string]groups.Role{
			bob.Account.Principal().String(): groups.Role_EDITOR,
		},
	})
	require.NoError(t, err)

	group2, err := alicesrv.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title: "My Group 2",
	})
	require.NoError(t, err)

	group2, err = alicesrv.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group2.Id,
		UpdatedMembers: map[string]groups.Role{
			carol.Account.Principal().String(): groups.Role_EDITOR,
		},
	})
	require.NoError(t, err)

	wants := map[string]*groups.ListAccountGroupsResponse{
		alice.Account().String(): {
			Items: []*groups.ListAccountGroupsResponse_Item{
				{Group: group1, Role: groups.Role_OWNER},
				{Group: group2, Role: groups.Role_OWNER},
			},
		},
		bob.Account.String(): {
			Items: []*groups.ListAccountGroupsResponse_Item{
				{Group: group1, Role: groups.Role_EDITOR},
			},
		},
		carol.Account.String(): {
			Items: []*groups.ListAccountGroupsResponse_Item{
				{Group: group2, Role: groups.Role_EDITOR},
			},
		},
	}

	for acc, want := range wants {
		list, err := alicesrv.ListAccountGroups(ctx, &groups.ListAccountGroupsRequest{
			AccountId: acc,
		})
		require.NoError(t, err)

		testutil.ProtoEqual(t, want, list, "list groups for account response must match")
	}
}

func TestGroupMembersAfterSync(t *testing.T) {
	// Alice creates a group, adds bob, then syncs with bob.
	// Bob should be able to edit the group and use it as a member.

	t.Parallel()

	alice := newTestSrv(t, "alice")
	bob := newTestSrv(t, "bob")
	ctx := context.Background()

	group, err := alice.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title: "My Group",
	})
	require.NoError(t, err)

	wantMembers := &groups.ListMembersResponse{
		OwnerAccountId: alice.me.MustGet().Account().Principal().String(),
		Members: map[string]groups.Role{
			alice.me.MustGet().Account().Principal().String(): groups.Role_OWNER,
			bob.me.MustGet().Account().Principal().String():   groups.Role_EDITOR,
		},
	}

	// Make some updates and add bob as an editor.
	{
		group, err = alice.UpdateGroup(ctx, &groups.UpdateGroupRequest{
			Id:          group.Id,
			Title:       "Alice from the Wonderland",
			Description: wrapperspb.String("Just a test group"),
		})
		require.NoError(t, err)

		group, err = alice.UpdateGroup(ctx, &groups.UpdateGroupRequest{
			Id: group.Id,
			UpdatedMembers: map[string]groups.Role{
				bob.me.MustGet().Account().Principal().String(): groups.Role_EDITOR,
			},
		})
		require.NoError(t, err)

		members, err := alice.ListMembers(ctx, &groups.ListMembersRequest{
			Id: group.Id,
		})
		require.NoError(t, err)
		testutil.ProtoEqual(t, wantMembers, members, "list members response must match")
		require.Len(t, members.Members, 2, "alice and bob must be members of alice's group")
	}

	syncBlobs(t, alice, bob)

	groupList, err := bob.ListGroups(ctx, &groups.ListGroupsRequest{})
	require.NoError(t, err)
	require.Len(t, groupList.Groups, 1, "bob must have alice's group")

	membersPerBob, err := bob.ListMembers(ctx, &groups.ListMembersRequest{Id: group.Id})
	require.NoError(t, err)
	require.Len(t, membersPerBob.Members, 2, "alice and bob must be members of alice's group")
	testutil.ProtoEqual(t, wantMembers, membersPerBob, "list members response must match on bob")

	bobGroups, err := bob.ListAccountGroups(ctx, &groups.ListAccountGroupsRequest{
		AccountId: bob.me.MustGet().Account().Principal().String(),
	})
	require.NoError(t, err)
	require.Len(t, bobGroups.Items, 1, "bob must be a member of alice's group")
	testutil.ProtoEqual(t, group, bobGroups.Items[0].Group, "bob's group must match alice's group")
	require.Equal(t, bobGroups.Items[0].Role, groups.Role_EDITOR, "bob must be an editor of alice's group")

	_, err = bob.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id:    group.Id,
		Title: "Bob, Not Bob",
	})
	require.NoError(t, err, "bob must be able to edit alice's group as an editor")
}

func TestGroupNonMembers(t *testing.T) {
	// Alice creates a group, adds bob, then syncs with bob.
	// Bob should be able to edit the group and use it as a member.

	t.Parallel()

	alice := newTestSrv(t, "alice")
	bob := newTestSrv(t, "bob")
	ctx := context.Background()

	group, err := alice.CreateGroup(ctx, &groups.CreateGroupRequest{
		Title: "Alice from the Wonderland",
	})
	require.NoError(t, err)

	aliceGroups, err := alice.ListAccountGroups(ctx, &groups.ListAccountGroupsRequest{
		AccountId: alice.me.MustGet().Account().Principal().String(),
	})
	require.NoError(t, err)
	require.Len(t, aliceGroups.Items, 1, "alice must be an owner of her group on her own device")

	syncBlobs(t, alice, bob)

	groupList, err := bob.ListGroups(ctx, &groups.ListGroupsRequest{})
	require.NoError(t, err)
	require.Len(t, groupList.Groups, 1, "bob must have alice's group")

	aliceGroups, err = bob.ListAccountGroups(ctx, &groups.ListAccountGroupsRequest{
		AccountId: alice.me.MustGet().Account().String(),
	})
	require.NoError(t, err)
	require.Len(t, aliceGroups.Items, 1, "alice must belong to her own group on bob's device")
	testutil.ProtoEqual(t, group, aliceGroups.Items[0].Group, "alice's group must match alice's group")

	bobGroups, err := bob.ListAccountGroups(ctx, &groups.ListAccountGroupsRequest{
		AccountId: bob.me.MustGet().Account().String(),
	})
	require.NoError(t, err)
	require.Len(t, bobGroups.Items, 0, "bob must not be member of any groups")
}

func TestBug_MustConsiderMemberChangesToo(t *testing.T) {
	t.Parallel()

	alice := newTestSrv(t, "alice")
	bob := newTestSrv(t, "bob")
	ctx := context.Background()

	group, err := alice.CreateGroup(ctx, &groups.CreateGroupRequest{Title: "Alice from the Wonderland"})
	require.NoError(t, err)

	group, err = alice.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id: group.Id,
		UpdatedMembers: map[string]groups.Role{
			bob.me.MustGet().Account().Principal().String(): groups.Role_EDITOR,
		},
	})
	require.NoError(t, err)

	syncBlobs(t, alice, bob)

	newTitle := "Alice from the Wonderland and Bob from Mordor"

	group, err = bob.UpdateGroup(ctx, &groups.UpdateGroupRequest{
		Id:    group.Id,
		Title: newTitle,
	})
	require.NoError(t, err)

	require.Equal(t, newTitle, group.Title)

	gotGroup, err := bob.GetGroup(ctx, &groups.GetGroupRequest{Id: group.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, group, gotGroup, "get group response must match in Bob")

	syncBlobs(t, bob, alice)

	gotGroup, err = alice.GetGroup(ctx, &groups.GetGroupRequest{Id: group.Id})
	require.NoError(t, err)
	testutil.ProtoEqual(t, group, gotGroup, "get group response must match in Alice")
}

func syncBlobs(t *testing.T, src, target *Server) {
	ctx := context.Background()
	srcKeys, err := src.blobs.IPFSBlockstore().AllKeysChan(ctx)
	require.NoError(t, err)

	srcBS := src.blobs.IPFSBlockstore()
	targetBS := target.blobs.IPFSBlockstore()

	for c := range srcKeys {
		blk, err := srcBS.Get(ctx, c)
		require.NoError(t, err)

		require.NoError(t, targetBS.Put(ctx, blk))
	}
}

func newTestSrv(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)

	db := storage.MakeTestDB(t)

	fut := future.New[core.Identity]()
	require.NoError(t, fut.Resolve(u.Identity))

	bs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))

	node := future.New[*mttnet.Node]()
	srv := NewServer(fut.ReadOnly, logging.New("seed/groups", "debug"), NewSQLiteDB(db), bs, node.ReadOnly)

	_, err := daemon.Register(context.Background(), bs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	_, err = srv.me.Await(context.Background())
	require.NoError(t, err)

	return srv
}
