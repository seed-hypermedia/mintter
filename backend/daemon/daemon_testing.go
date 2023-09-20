package daemon

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	"mintter/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
)

// MakeTestApp creates a new daemon app for testing.
func MakeTestApp(t *testing.T, name string, cfg config.Config, register bool) *App {
	return makeTestApp(t, name, cfg, register)
}

// MakeTestConfig creates a new default config for testing.
func MakeTestConfig(t *testing.T) config.Config {
	return makeTestConfig(t)
}

func makeTestApp(t *testing.T, name string, cfg config.Config, register bool) *App {
	ctx, cancel := context.WithCancel(context.Background())

	u := coretest.NewTester(name)

	repo, err := InitRepo(cfg.Base.DataDir, u.Device.Wrapped())
	require.NoError(t, err)

	app, err := Load(ctx, cfg, repo)
	require.NoError(t, err)
	t.Cleanup(func() {
		cancel()
		require.Equal(t, context.Canceled, app.Wait())
	})

	if register {
		err = app.RPC.Daemon.RegisterAccount(ctx, u.Account)
		require.NoError(t, err)

		_, err = app.Net.Await(ctx)
		require.NoError(t, err)

		_, err = app.Storage.Identity().Await(ctx)
		require.NoError(t, err)

		prof := &accounts.Profile{
			Alias: name,
			Bio:   name + " bio",
		}
		acc, err := app.RPC.Accounts.UpdateProfile(ctx, prof)
		require.NoError(t, err)
		testutil.ProtoEqual(t, prof, acc.Profile, "profile update must return full profile")
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
