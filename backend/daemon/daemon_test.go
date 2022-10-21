package daemon

import (
	"context"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqlitedbg"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"os"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
)

func TestBug_SyncHangs(t *testing.T) {
	// See: https://github.com/mintterteam/mintter/issues/712.
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)
	bob := makeTestApp(t, "bob", makeTestConfig(t), true)
	carol := makeTestApp(t, "carol", makeTestConfig(t), true)
	ctx := context.Background()

	var g errgroup.Group
	g.Go(func() error {
		_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
			Addrs: getAddrs(t, bob),
		})
		return err
	})

	g.Go(func() error {
		_, err := alice.RPC.Daemon.ForceSync(ctx, &daemon.ForceSyncRequest{})
		return err
	})

	require.NoError(t, func() error {
		_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
			Addrs: getAddrs(t, carol),
		})
		return err
	}())

	require.NoError(t, g.Wait())

}

func TestBug_PublicationsListInconsistent(t *testing.T) {
	// See: https://github.com/mintterteam/mintter/issues/692.
	// Although it turns out this bug may not be the daemon's issue.
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)
	ctx := context.Background()

	publish := func(ctx context.Context, t *testing.T, title, text string) *documents.Publication {
		draft, err := alice.RPC.Documents.CreateDraft(ctx, &documents.CreateDraftRequest{})
		require.NoError(t, err)

		_, err = alice.RPC.Documents.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{
					Op: &documents.DocumentChange_SetTitle{SetTitle: title},
				},
				{
					Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "b1",
						Parent:      "",
						LeftSibling: "",
					}},
				},
				{
					Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
						Id:   "b1",
						Text: "Hello world",
					}},
				},
			},
		})
		require.NoError(t, err)

		pub, err := alice.RPC.Documents.PublishDraft(ctx, &documents.PublishDraftRequest{
			DocumentId: draft.Id,
		})
		require.NoError(t, err)

		return pub
	}

	want := []*documents.Publication{
		publish(ctx, t, "Doc-1", "This is a doc-1"),
		publish(ctx, t, "Doc-2", "This is a doc-2"),
		publish(ctx, t, "Doc-3", "This is a doc-3"),
		publish(ctx, t, "Doc-4", "This is a doc-4"),
	}

	var g errgroup.Group

	// Trying this more than once and expecting it to return the same result. This is what bug was mostly about.
	// Arbitrary number of attempts was chosen.
	for i := 0; i < 15; i++ {
		g.Go(func() error {
			list, err := alice.RPC.Documents.ListPublications(ctx, &documents.ListPublicationsRequest{})
			require.NoError(t, err)

			require.Len(t, list.Publications, len(want))

			for w := range want {
				testutil.ProtoEqual(t, want[w], list.Publications[w], "publication %d doesn't match", w)
			}
			return nil
		})
	}

	require.NoError(t, g.Wait())
}

func TestDaemonList(t *testing.T) {
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)

	conn, err := grpc.Dial(alice.GRPCListener.Addr().String(), grpc.WithBlock(), grpc.WithInsecure())
	require.NoError(t, err)
	defer conn.Close()

	client := documents.NewPublicationsClient(conn)

	list, err := client.ListPublications(context.Background(), &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0, "account object must not be listed as publication")

	_, err = client.DeletePublication(context.Background(), &documents.DeletePublicationRequest{
		DocumentId: alice.Me.MustGet().AccountID().String(),
	})
	require.Error(t, err, "we must not be able to delete other objects than publications")
}

func TestDaemonSmoke(t *testing.T) {
	t.Parallel()

	dmn := makeTestApp(t, "alice", makeTestConfig(t), false)
	ctx := context.Background()

	conn, err := grpc.Dial(dmn.GRPCListener.Addr().String(), grpc.WithBlock(), grpc.WithInsecure())
	require.NoError(t, err)
	defer conn.Close()

	ac := accounts.NewAccountsClient(conn)
	dc := daemon.NewDaemonClient(conn)
	nc := networking.NewNetworkingClient(conn)

	acc, err := ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.Error(t, err)
	require.Nil(t, acc)

	seed, err := dc.GenMnemonic(ctx, &daemon.GenMnemonicRequest{
		MnemonicsLength: 12,
	})
	require.NoError(t, err)

	reg, err := dc.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	require.NotNil(t, reg)
	require.NotEqual(t, "", reg.AccountId, "account ID must be generated after registration")

	_, err = dmn.Me.Await(ctx)
	require.NoError(t, err)

	_, err = dmn.Net.Await(ctx)
	require.NoError(t, err)

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

func TestPeriodicSync(t *testing.T) {
	t.Parallel()

	acfg := makeTestConfig(t)
	bcfg := makeTestConfig(t)

	acfg.Syncing.WarmupDuration = 1 * time.Millisecond
	bcfg.Syncing.WarmupDuration = 1 * time.Millisecond

	acfg.Syncing.Interval = 150 * time.Millisecond
	bcfg.Syncing.Interval = 150 * time.Millisecond

	alice := makeTestApp(t, "alice", acfg, true)
	bob := makeTestApp(t, "bob", bcfg, true)
	ctx := context.Background()

	_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
		Addrs: getAddrs(t, bob),
	})
	require.NoError(t, err)

	time.Sleep(200 * time.Millisecond)

	checkListAccounts := func(t *testing.T, a, b *App, msg string) {
		accs, err := a.RPC.Accounts.ListAccounts(ctx, &accounts.ListAccountsRequest{})
		require.NoError(t, err)

		bacc := must.Do2(b.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))

		require.Len(t, accs.Accounts, 1, msg)
		testutil.ProtoEqual(t, bacc, accs.Accounts[0], "a must fetch b's account fully")
	}

	checkListAccounts(t, alice, bob, "alice to bob")
	checkListAccounts(t, bob, alice, "bob to alice")
}

func TestMultiDevice(t *testing.T) {
	t.Skip()

	t.Parallel()

	alice1 := makeTestApp(t, "alice", makeTestConfig(t), true)
	alice2 := makeTestApp(t, "alice-2", makeTestConfig(t), true)
	ctx := context.Background()

	_, err := alice1.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
		Addrs: getAddrs(t, alice2),
	})
	require.NoError(t, err)

	acc1 := must.Do2(alice1.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	acc2 := must.Do2(alice2.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	require.False(t, proto.Equal(acc1, acc2), "accounts must not match before syncing")

	{
		sr := must.Do2(alice1.Syncing.MustGet().Sync(ctx))
		require.Equal(t, int64(1), sr.NumSyncOK)
		require.Equal(t, int64(0), sr.NumSyncFailed)
		require.Equal(t, []cid.Cid{alice1.Repo.Device().CID(), alice2.Repo.Device().CID()}, sr.Devices)
	}

	// TODO(burdiyan): build11: here it must handle the concurrency properly. See: https://github.com/mintterteam/mintter/issues/687.
	sqlitedbg.ExecPool(alice1.DB, os.Stdout, "select * from named_versions")
	return
	{
		sr := must.Do2(alice2.Syncing.MustGet().Sync(ctx))
		require.Equal(t, int64(1), sr.NumSyncOK)
		require.Equal(t, int64(0), sr.NumSyncFailed)
		require.Equal(t, []cid.Cid{alice2.Repo.Device().CID(), alice1.Repo.Device().CID()}, sr.Devices)
	}

	time.Sleep(2 * time.Second)

	fmt.Println("alice1")
	sqlitedbg.ExecPool(alice1.DB, os.Stdout, "SELECT multihash, id FROM ipfs_blocks ORDER BY multihash")
	fmt.Println("alice2")
	sqlitedbg.ExecPool(alice2.DB, os.Stdout, "SELECT multihash, id FROM ipfs_blocks ORDER BY multihash")

	return

	acc1 = must.Do2(alice1.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	acc2 = must.Do2(alice2.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	testutil.ProtoEqual(t, acc1, acc2, "accounts must match after sync")

	require.Len(t, acc2.Devices, 2, "must have two devices after syncing")
}

func getAddrs(t *testing.T, a *App) []string {
	return mttnet.AddrInfoToStrings(a.Net.MustGet().AddrInfo())
}

func makeTestApp(t *testing.T, name string, cfg config.Config, register bool) *App {
	ctx, cancel := context.WithCancel(context.Background())

	u := coretest.NewTester(name)

	repo, err := initRepo(cfg, u.Device.Wrapped())
	require.NoError(t, err)

	app, err := loadApp(ctx, cfg, repo)
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

		_, err = app.Me.Await(ctx)
		require.NoError(t, err)

		prof := &accounts.Profile{
			Alias: name,
			Bio:   name + " bio",
			Email: name + "@example.com",
		}
		acc, err := app.RPC.Accounts.UpdateProfile(ctx, prof)
		require.NoError(t, err)
		testutil.ProtoEqual(t, prof, acc.Profile, "profile update must return full profile")
	}

	return app
}

func makeTestConfig(t *testing.T) config.Config {
	cfg := config.Default()

	cfg.HTTPPort = 0
	cfg.GRPCPort = 0
	cfg.RepoPath = testutil.MakeRepoPath(t)
	cfg.P2P.Port = 0
	cfg.P2P.NoBootstrap = true
	cfg.P2P.NoRelay = true
	cfg.P2P.NoMetrics = true

	return cfg
}
