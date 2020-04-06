package server_test

import (
	"context"
	"encoding/json"
	"mintter/backend/server"
	"mintter/proto"
	"os"
	"path/filepath"
	"testing"

	peer "github.com/libp2p/go-libp2p-peer"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestInitProfile(t *testing.T) {
	srv := newSeededServer(t)
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
	ctx := context.Background()

	resp, err := srv.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.NotEqual(t, "", resp.Profile.PeerId)

	// Server must be able to load initialized profile after restart.
	srv, err = server.NewServer(srv.RepoPath(), zap.NewNop())
	require.NoError(t, err)

	resp, err = srv.GetProfile(ctx, &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.NotEqual(t, "", resp.Profile.PeerId)
}

func TestUpdateProfile(t *testing.T) {
	srv := newSeededServer(t)
	ctx := context.Background()

	resp, err := srv.UpdateProfile(ctx, &proto.UpdateProfileRequest{
		Profile: &proto.Profile{
			Username: "burdiyan",
			Email:    "foo@example.com",
			Bio:      "Fake bio",
		},
	})
	require.NoError(t, err)
	require.Equal(t, "burdiyan", resp.Profile.Username)
	require.Equal(t, "foo@example.com", resp.Profile.Email)
	require.Equal(t, "Fake bio", resp.Profile.Bio)
	require.NotEqual(t, "", resp.Profile.PeerId)
}

func TestLoadProfile(t *testing.T) {
	srv := newServer(t)

	fileName := filepath.Join(srv.RepoPath(), "profile.json")
	f, err := os.Create(fileName)
	require.NoError(t, err)

	pid, err := peer.IDB58Decode("QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ")
	require.NoError(t, err)

	err = json.NewEncoder(f).Encode(map[string]interface{}{
		"peerID": pid.String(),
	})
	require.NoError(t, err)
	require.NoError(t, f.Close())

	// GetProfile must work if profile is stored in the file.
	resp, err := srv.GetProfile(context.Background(), &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, pid.String(), resp.Profile.PeerId)

	_, err = srv.InitProfile(context.Background(), &proto.InitProfileRequest{})
	require.Error(t, err, "init must fail if profile is cached")

	// GetProfile must return cached profile even if file disappears.
	require.NoError(t, os.Remove(fileName))
	resp, err = srv.GetProfile(context.Background(), &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, pid.String(), resp.Profile.PeerId)
}
