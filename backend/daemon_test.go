package backend

import (
	"context"
	"fmt"
	accounts "mintter/api/go/accounts/v1alpha"
	daemon "mintter/api/go/daemon/v1alpha"
	"mintter/backend/config"
	"mintter/backend/testutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
)

func TestDaemonEndToEnd(t *testing.T) {
	cfg := config.Config{
		HTTPPort:      "",
		GRPCPort:      "",
		NoOpenBrowser: true,
		RepoPath:      testutil.MakeRepoPath(t),
		P2P: config.P2P{
			Addr:        "/ip4/0.0.0.0/tcp/0",
			NoBootstrap: true,
			NoRelay:     true,
			NoTLS:       true,
		},
	}

	ctx := context.Background()

	d, err := StartDaemonWithConfig(cfg)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, d.Close())
	})

	cc, err := grpc.Dial(d.lis.Addr().String(),
		grpc.WithBlock(),
		grpc.WithInsecure(),
	)
	require.NoError(t, err)
	defer cc.Close()

	accs := accounts.NewAccountsClient(cc)
	resp, err := accs.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.Error(t, err)
	require.Nil(t, resp)

	dc := daemon.NewDaemonClient(cc)

	seed, err := dc.GenSeed(ctx, &daemon.GenSeedRequest{})
	require.NoError(t, err)

	reg, err := dc.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	require.NotNil(t, reg)

	require.NoError(t,
		filepath.Walk(cfg.RepoPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			fmt.Println(path)

			return nil
		}),
	)
}
