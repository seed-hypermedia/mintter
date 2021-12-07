package backend

import (
	"context"
	"testing"
	"time"

	accounts "mintter/backend/api/accounts/v1alpha"
	daemon "mintter/backend/api/daemon/v1alpha"
	networking "mintter/backend/api/networking/v1alpha"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
	"go.uber.org/fx"
	"google.golang.org/grpc"
)

func TestLibp2p(t *testing.T) {
	cfg := config.P2P{
		Addr:        "/ip4/0.0.0.0/tcp/0",
		NoBootstrap: true,
		NoRelay:     true,
		NoTLS:       true,
		NoMetrics:   true,
	}

	tt := makeTester(t, "alice")

	repo := makeTestRepo(t, tt)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var n *ipfsutil.Libp2p
	app := fx.New(
		fx.Supply(cfg),
		fx.Supply(repo),
		fx.Provide(
			ipfsutil.DefaultBootstrapPeers,
			provideDatastore,
			providePeerstore,
			provideBadger,
			provideLibp2p,
		),
		fx.Populate(&n),
	)

	require.NoError(t, app.Start(ctx))
	defer func() {
		stopCtx, cancel := context.WithTimeout(context.Background(), time.Second*30)
		defer cancel()
		require.NoError(t, app.Stop(stopCtx))
	}()

	require.NotNil(t, n.Host)
	require.NotNil(t, n.Routing)
}

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
			NoMetrics:   true,
		},
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var srv *grpcServer
	app := fx.New(
		Module(cfg),
		fx.Populate(&srv),
	)

	require.NoError(t, app.Start(ctx))
	defer func() {
		stopCtx, cancel := context.WithTimeout(context.Background(), time.Second*30)
		defer cancel()
		require.Equal(t, context.Canceled, app.Stop(stopCtx))
	}()

	<-srv.ready

	cc, err := grpc.Dial(srv.lis.Addr().String(),
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

	infoResp, err := dc.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.NotNil(t, infoResp)
	require.NotEqual(t, "", infoResp.AccountId)
	require.NotEqual(t, "", infoResp.PeerId)

	peerInfo, err := nc.GetPeerInfo(ctx, &networking.GetPeerInfoRequest{
		PeerId: infoResp.PeerId,
	})
	require.NoError(t, err)
	require.NotNil(t, peerInfo)
	require.NotEqual(t, "", peerInfo.AccountId)
}
