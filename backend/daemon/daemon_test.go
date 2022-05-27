package daemon

import (
	"context"
	"mintter/backend/config"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/testutil"
	"testing"
	"time"

	faker "github.com/bxcodec/faker/v3"

	"github.com/stretchr/testify/require"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
	"google.golang.org/grpc"
)

func TestBug_UnableOpenThirdPartyDocument(t *testing.T) {
	t.Parallel()

	alice := makeTestDaemon(t, "alice", true)
	bob := makeTestDaemon(t, "bob", true)
	ctx := context.Background()

	alice.connect(ctx, t, bob)

	alice.makeTestPublication(t, ctx)
}

func TestDaemonList(t *testing.T) {
	t.Parallel()

	alice := makeTestDaemon(t, "alice", true)

	list, err := documents.NewPublicationsClient(alice.grpcConn).ListPublications(context.Background(), &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0, "account object must not be listed as publication")

	_, err = documents.NewPublicationsClient(alice.grpcConn).DeletePublication(context.Background(), &documents.DeletePublicationRequest{
		DocumentId: alice.Me.MustGet().AccountID().String(),
	})
	require.Error(t, err, "we must not be able to delete other objects than publications")
}

func TestDaemonSync(t *testing.T) {
	t.Parallel()

	alice := makeTestDaemon(t, "alice", true)
	bob := makeTestDaemon(t, "bob", true)
	ctx := context.Background()

	alice.connect(ctx, t, bob)

	pub := alice.makeTestPublication(t, ctx)

	_, err := bob.Net.MustGet().Sync(ctx)
	require.NoError(t, err)

	pub2, err := documents.NewPublicationsClient(bob.grpcConn).GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: pub.Document.Id,
	})
	require.NoError(t, err)

	testutil.ProtoEqual(t, pub, pub2, "bob must sync alice's publication")

	aliceInBob, err := accounts.NewAccountsClient(bob.grpcConn).GetAccount(ctx, &accounts.GetAccountRequest{
		Id: alice.Me.MustGet().AccountID().String(),
	})
	require.NoError(t, err)
	testutil.ProtoEqual(t, alice.pbAccount, aliceInBob, "bob must sync alice's account")
}

func TestDaemonConnect(t *testing.T) {
	t.Parallel()

	alice := makeTestDaemon(t, "alice", true)
	bob := makeTestDaemon(t, "bob", true)
	ctx := context.Background()

	alice.connect(ctx, t, bob)

	checkListAccounts := func(t *testing.T, a, b *testDaemon) {
		accs, err := accounts.NewAccountsClient(a.grpcConn).ListAccounts(ctx, &accounts.ListAccountsRequest{})
		require.NoError(t, err)

		require.Len(t, accs.Accounts, 1, a.name+" must have one account after connecting to "+b.name)
		testutil.ProtoEqual(t, b.pbAccount, accs.Accounts[0], a.name+" must have the other account after connecting and verifying it")
	}

	checkListAccounts(t, alice, bob)
	time.Sleep(time.Second)
	checkListAccounts(t, bob, alice)
}

func TestDaemonSmoke(t *testing.T) {
	t.Parallel()

	dmn := makeTestDaemon(t, "alice", false)
	ctx := context.Background()

	ac := accounts.NewAccountsClient(dmn.grpcConn)
	dc := daemon.NewDaemonClient(dmn.grpcConn)
	nc := networking.NewNetworkingClient(dmn.grpcConn)

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

type testDaemon struct {
	*Daemon

	name      string
	grpcConn  *grpc.ClientConn
	pbAccount *accounts.Account
}

func (d *testDaemon) connect(ctx context.Context, t *testing.T, remote *testDaemon) {
	conn, err := networking.NewNetworkingClient(d.grpcConn).Connect(ctx, &networking.ConnectRequest{
		Addrs: remote.addrs(),
	})
	require.NoError(t, err)
	require.NotNil(t, conn)
}

func (d *testDaemon) addrs() []string {
	return mttnet.AddrInfoToStrings(d.Net.MustGet().AddrInfo())
}

func (d *testDaemon) awaitNet(t *testing.T) {
	_, err := d.Net.Await(context.Background())
	require.NoError(t, err)
}

func (d *testDaemon) makeTestPublication(t *testing.T, ctx context.Context) *documents.Publication {
	dc := documents.NewDraftsClient(d.grpcConn)

	draft, err := dc.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)

	_, err = dc.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
		DocumentId: draft.Id,
		Changes: []*documents.DocumentChange{
			{Op: &documents.DocumentChange_SetTitle{SetTitle: faker.Sentence()}},
			{Op: &documents.DocumentChange_SetSubtitle{SetSubtitle: faker.Sentence()}},
			{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
			{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
				Id:   "b1",
				Type: "statement",
				Text: faker.Sentence(),
			}}},
		},
	})
	require.NoError(t, err)

	pub, err := dc.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	require.NotNil(t, pub)
	return pub
}

func makeTestDaemon(t *testing.T, name string, register bool) *testDaemon {
	// TODO: be able to pass existing device key and account key.

	cfg := config.Config{
		HTTPPort:      "",
		GRPCPort:      "",
		NoOpenBrowser: true,
		RepoPath:      testutil.MakeRepoPath(t),
		P2P: config.P2P{
			Port:        0,
			NoBootstrap: true,
			NoRelay:     true,
			NoMetrics:   true,
		},
	}

	var dmn Daemon

	app := fxtest.New(t, Module(cfg), fx.Populate(&dmn))

	app.RequireStart()
	t.Cleanup(app.RequireStop)

	<-dmn.GRPC.ready

	conn, err := grpc.Dial(dmn.GRPC.lis.Addr().String(), grpc.WithBlock(), grpc.WithInsecure())
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, conn.Close())
	})

	var a *accounts.Account
	if register {
		dc := daemon.NewDaemonClient(conn)
		seed, err := dc.GenSeed(context.Background(), &daemon.GenSeedRequest{})
		require.NoError(t, err)

		_, err = dc.Register(context.Background(), &daemon.RegisterRequest{
			Mnemonic: seed.Mnemonic,
		})
		require.NoError(t, err)

		prof := &accounts.Profile{
			Alias: name,
			Bio:   name + " bio",
			Email: name + "@example.com",
		}
		acc, err := accounts.NewAccountsClient(conn).UpdateProfile(context.Background(), prof)
		require.NoError(t, err)
		testutil.ProtoEqual(t, prof, acc.Profile, "profile update must return full profile")

		_, err = dmn.Net.Await(context.Background())
		require.NoError(t, err)

		a = acc
	}

	return &testDaemon{
		Daemon:    &dmn,
		grpcConn:  conn,
		pbAccount: a,
		name:      name,
	}
}
