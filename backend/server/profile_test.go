package server_test

import (
	"context"
	"mintter/backend/server"
	"mintter/proto"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestInitProfile(t *testing.T) {
	srv := newSeededServer(t)
	defer func() {
		require.NoError(t, srv.Close())
	}()

	ctx := context.Background()

	_, err := srv.InitProfile(ctx, &proto.InitProfileRequest{
		Mnemonic: testMnemonic,
	})
	require.Error(t, err, "InitProfile more than once must fail")

	perr, ok := status.FromError(err)
	require.True(t, ok, "error must be grpc error")
	require.Equal(t, codes.FailedPrecondition, perr.Code())
}

func TestGetProfile(t *testing.T) {
	srv := newSeededServer(t)
	defer func() {
		require.NoError(t, srv.Close())
	}()

	ctx := context.Background()

	r1, err := srv.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, "12D3KooWGkrLHeWFdhFoLqjbxriuHT6Nm1k8HNZmagP8Lj4FLJw4", r1.Profile.PeerId)
	require.NotEqual(t, "", r1.Profile.AccountId)

	// Server must be able to load initialized profile after restart.
	require.NoError(t, srv.Close())
	srv, err = server.NewServer(srv.Config(), zap.NewNop())
	require.NoError(t, err)

	r2, err := srv.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, r1, r2)
}

func TestListProfiles(t *testing.T) {
	alice := newSeededServer(t, testMnemonic...)
	bob := newSeededServer(t, testMnemonic2...)
	defer func() {
		require.NoError(t, alice.Close())
		require.NoError(t, bob.Close())
	}()
	ctx := context.Background()

	connectPeers(t, ctx, alice, bob)

	var bobID string
	{
		resp, err := bob.GetProfile(ctx, &proto.GetProfileRequest{})
		require.NoError(t, err)
		bobID = resp.Profile.AccountId
	}

	bobProf, err := alice.GetProfile(ctx, &proto.GetProfileRequest{
		ProfileId: bobID,
	})
	require.NoError(t, err)

	resp, err := alice.ListProfiles(ctx, &proto.ListProfilesRequest{})
	require.NoError(t, err)
	require.Len(t, resp.Profiles, 1)
	require.Equal(t, bobProf.Profile, resp.Profiles[0])
}

func TestUpdateProfile(t *testing.T) {
	srv := newSeededServer(t)
	defer func() {
		require.NoError(t, srv.Close())
	}()

	ctx := context.Background()

	resp, err := srv.UpdateProfile(ctx, &proto.UpdateProfileRequest{
		Profile: &proto.Profile{
			PeerId:   "bad peer id",
			Username: "burdiyan",
			Email:    "foo@example.com",
			Bio:      "Fake bio",
		},
	})
	require.NoError(t, err)

	require.Equal(t, "12D3KooWGkrLHeWFdhFoLqjbxriuHT6Nm1k8HNZmagP8Lj4FLJw4", resp.Profile.PeerId)
	require.Equal(t, "burdiyan", resp.Profile.Username)
	require.Equal(t, "foo@example.com", resp.Profile.Email)
	require.Equal(t, "Fake bio", resp.Profile.Bio)

	get, err := srv.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, resp.Profile, get.Profile)

	// It must return the same profile when server restarts.
	require.NoError(t, srv.Close())
	srv, err = server.NewServer(srv.Config(), zap.NewNop())
	require.NoError(t, err)

	get, err = srv.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, resp.Profile, get.Profile)
}
