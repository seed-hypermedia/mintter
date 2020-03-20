package server_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"mintter/backend/server"
	"mintter/proto"

	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var _ proto.MintterServer = (*server.Server)(nil)

func TestInitProfile(t *testing.T) {
	srv := newServer(t)
	ctx := context.Background()

	var mnemonic []string

	t.Run("seed must be 24 words", func(t *testing.T) {
		resp, err := srv.GenSeed(ctx, &proto.GenSeedRequest{})

		require.NoError(t, err)
		require.Equal(t, 24, len(resp.Mnemonic))

		mnemonic = resp.Mnemonic
	})

	t.Run("daemon must initialize and only once", func(t *testing.T) {
		_, err := srv.InitWallet(ctx, &proto.InitWalletRequest{
			Mnemonic: mnemonic,
		})

		require.NoError(t, err)

		_, err = srv.InitWallet(ctx, &proto.InitWalletRequest{
			Mnemonic: mnemonic,
		})

		require.Error(t, err, "init more than once must fail")

		perr, ok := status.FromError(err)

		require.True(t, ok, "error must be grpc error")
		require.Equal(t, codes.FailedPrecondition, perr.Code())
	})

	t.Run("daemon must return profile after initialized", func(t *testing.T) {
		resp, err := srv.GetProfile(ctx, &proto.GetProfileRequest{})

		require.NoError(t, err)

		require.NotEqual(t, "", resp.Profile.PeerId)
	})

	t.Run("daemon must update profile", func(t *testing.T) {
		resp, err := srv.UpdateProfile(ctx, &proto.UpdateProfileRequest{
			Profile: &proto.Profile{
				Username: "burdiyan",
			},
		})
		require.NoError(t, err)
		require.Equal(t, "burdiyan", resp.Profile.Username)
	})
}

func TestLoadProfile(t *testing.T) {
	srv := newServer(t)

	fileName := filepath.Join(srv.RepoPath(), "profile.json")
	f, err := os.Create(fileName)
	require.NoError(t, err)

	pid, err := peer.IDB58Decode("QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ")
	require.NoError(t, err)

	err = json.NewEncoder(f).Encode(map[string]interface{}{
		"PeerID": pid.String(),
	})
	require.NoError(t, err)
	require.NoError(t, f.Close())

	// GetProfile must work if profile is stored in the file.
	resp, err := srv.GetProfile(context.Background(), &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, pid.String(), resp.Profile.PeerId)

	_, err = srv.InitWallet(context.Background(), &proto.InitWalletRequest{})
	require.Error(t, err, "init must fail if profile is cached")

	// GetProfile must return cached profile even if file disappears.
	require.NoError(t, os.Remove(fileName))
	resp, err = srv.GetProfile(context.Background(), &proto.GetProfileRequest{})
	require.NoError(t, err)
	require.Equal(t, pid.String(), resp.Profile.PeerId)
}

func newServer(t *testing.T) *server.Server {
	t.Helper()

	repoPath := fmt.Sprintf("test-repo-%d", time.Now().UnixNano())
	repoPath = filepath.Join(os.TempDir(), repoPath)
	t.Cleanup(func() {
		os.RemoveAll(repoPath)
	})

	srv, err := server.NewServer(repoPath, zap.NewNop())
	if err != nil {
		t.Fatal(err)
	}

	return srv
}
