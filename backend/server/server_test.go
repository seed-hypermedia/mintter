package server_test

import (
	"context"
	"io/ioutil"
	"os"
	"testing"

	"mintter/backend/config"
	"mintter/backend/server"
	"mintter/proto"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

var _ proto.MintterServer = (*server.Server)(nil)

func testConfig(t *testing.T) config.Config {
	t.Helper()

	repoPath, err := ioutil.TempDir("", "mtt-server-test")
	require.NoError(t, err)
	t.Cleanup(func() {
		os.RemoveAll(repoPath)
	})

	return config.Config{
		RepoPath: repoPath,
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

var (
	testMnemonic  = []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	testMnemonic2 = []string{"ability", "panther", "verb", "beef", "load", "violin", "cloud", "miracle", "wage", "subway", "gravity", "enter", "cargo", "evil", "loop", "celery", "pass", "absurd", "switch", "auction", "under", "able", "rate", "tiger"}
)

func newSeededServer(t *testing.T, words ...string) *server.Server {
	t.Helper()
	srv := newServer(t)

	req := &proto.InitProfileRequest{
		Mnemonic: testMnemonic,
	}

	if words != nil {
		req.Mnemonic = words
	}

	_, err := srv.InitProfile(context.TODO(), req)

	require.NoError(t, err)

	return srv
}
