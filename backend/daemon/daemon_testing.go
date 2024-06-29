package daemon

import (
	"context"
	"seed/backend/config"
	"seed/backend/core"
	"seed/backend/core/coretest"
	storage "seed/backend/daemon/storage2"
	"seed/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

func makeTestApp(t *testing.T, name string, cfg config.Config, register bool) *App {
	ctx, cancel := context.WithCancel(context.Background())

	u := coretest.NewTester(name)

	repo, err := storage.Open(cfg.Base.DataDir, u.Device.Wrapped(), core.NewMemoryKeyStore(), "debug")
	require.NoError(t, err)

	app, err := Load(ctx, cfg, repo)
	require.NoError(t, err)
	t.Cleanup(func() {
		defer repo.Close()
		cancel()
		// require.Equal(t, context.Canceled, app.Wait())
		require.NoError(t, app.Wait())
	})

	if register {
		require.NoError(t, app.RPC.Daemon.RegisterAccount(ctx, "main", u.Account))
	}

	return app
}

func makeTestConfig(t *testing.T) config.Config {
	cfg := config.Default()

	cfg.HTTP.Port = 0
	cfg.GRPC.Port = 0
	cfg.Base.DataDir = testutil.MakeRepoPath(t)
	cfg.P2P.Port = 0
	cfg.P2P.BootstrapPeers = nil
	cfg.P2P.NoRelay = true
	cfg.P2P.NoMetrics = true
	return cfg
}
