package server_test

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"mintter/backend/server"
	"mintter/proto"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

var _ proto.MintterServer = (*server.Server)(nil)

func testRepoPath(t *testing.T) string {
	t.Helper()

	repoPath := fmt.Sprintf("test-repo-%d", time.Now().UnixNano())
	repoPath = filepath.Join(os.TempDir(), repoPath)
	t.Cleanup(func() {
		os.RemoveAll(repoPath)
	})

	return repoPath
}

func newServer(t *testing.T) *server.Server {
	t.Helper()

	srv, err := server.NewServer(testRepoPath(t), zap.NewNop())
	require.NoError(t, err)

	return srv
}

var testMnemonic = []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}

func newSeededServer(t *testing.T) *server.Server {
	t.Helper()
	srv := newServer(t)

	_, err := srv.InitProfile(context.TODO(), &proto.InitProfileRequest{
		Mnemonic: testMnemonic,
	})

	require.NoError(t, err)

	return srv
}
