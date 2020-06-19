package server_test

import (
	"testing"

	"mintter/backend/config"
	"mintter/backend/server"
	"mintter/backend/testutil"
	"mintter/proto"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

var _ proto.MintterServer = (*server.Server)(nil)

func testConfig(t *testing.T) config.Config {
	t.Helper()

	return config.Config{
		RepoPath: testutil.MakeRepoPath(t),
		P2P: config.P2P{
			Addr:        "/ip4/127.0.0.1/tcp/0",
			NoBootstrap: true,
			NoRelay:     true,
			NoTLS:       true,
		},
	}
}

func newServer(t *testing.T) *server.Server {
	t.Helper()

	srv, err := server.NewServer(testConfig(t), zap.NewNop())
	require.NoError(t, err)

	return srv
}

func newSeededServer(t *testing.T, name string) *server.Server {
	t.Helper()
	srv := newServer(t)
	require.NoError(t, srv.Seed(testutil.MakeProfile(t, name)))

	return srv
}
