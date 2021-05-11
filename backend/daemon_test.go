package backend

import (
	"context"
	"testing"

	accounts "mintter/api/go/accounts/v1alpha"
	daemon "mintter/api/go/daemon/v1alpha"
	networking "mintter/api/go/networking/v1alpha"
	"mintter/backend/config"
	"mintter/backend/testutil"

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

	ctx, cancel := context.WithCancel(context.Background())

	d := NewDaemon(cfg)
	errc := make(chan error, 1)
	go func() {
		errc <- d.Run(ctx)
	}()
	defer func() {
		cancel()
		if err := <-errc; err == context.Canceled {
			return
		} else {
			require.NoError(t, <-errc)
		}
	}()

	<-d.Ready()

	cc, err := grpc.Dial(d.lis.Addr().String(),
		grpc.WithBlock(),
		grpc.WithInsecure(),
	)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, cc.Close())
	}()

	ac := accounts.NewAccountsClient(cc)
	dc := daemon.NewDaemonClient(cc)
	nc := networking.NewNetworkingClient(cc)

	acc, err := ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.Error(t, err)
	require.Nil(t, acc)

	seed, err := dc.GenSeed(ctx, &daemon.GenSeedRequest{})
	require.NoError(t, err)

	reg, err := dc.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	require.NotNil(t, reg)
	require.NotEqual(t, "", reg.AccountId, "account ID must be generated after registration")

	acc, err = ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	require.Equal(t, reg.AccountId, acc.Id, "must return account after registration")
	require.Equal(t, 1, len(acc.Devices), "must return our own device after registration")
	require.Nil(t, acc.Profile, "must have no profile right after registration")

	profileUpdate := &accounts.Profile{
		Alias: "fulanito",
		Bio:   "Mintter Tester",
		Email: "fulanito@example.com",
	}

	updatedAcc, err := ac.UpdateProfile(ctx, profileUpdate)
	require.NoError(t, err)
	require.Equal(t, acc.Id, updatedAcc.Id)
	require.Equal(t, acc.Devices, updatedAcc.Devices)
	testutil.ProtoEqual(t, profileUpdate, updatedAcc.Profile, "profile update must return full profile")

	acc, err = ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updatedAcc, acc, "get account after update must match")

	// We have to wait for P2P node being fully initialized before exiting from the tests.
	<-d.p2p.Ready()

	infoResp, err := dc.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.NotNil(t, infoResp)
	require.NotEqual(t, "", infoResp.AccountId)
	require.NotEqual(t, "", infoResp.PeerId)

	addrsResp, err := nc.GetPeerAddrs(ctx, &networking.GetPeerAddrsRequest{
		PeerId: infoResp.PeerId,
	})
	require.NoError(t, err)
	require.NotNil(t, addrsResp)

	// require.NoError(t,
	// 	filepath.Walk(cfg.RepoPath, func(path string, info os.FileInfo, err error) error {
	// 		if err != nil {
	// 			return err
	// 		}

	// 		fmt.Println(path)

	// 		return nil
	// 	}),
	// )
}
