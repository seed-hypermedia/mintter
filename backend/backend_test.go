package backend

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"

	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
)

// func TestAccountSync(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	bob := makeTestBackend(t, "bob", true)
// 	ctx := context.Background()

// 	connectPeers(ctx, t, alice, bob, true)

// 	aliceAccount, err := alice.UpdateProfile(ctx, &accounts.Profile{
// 		Alias: "I just updated my profile",
// 	})
// 	require.NoError(t, err)

// 	require.NoError(t, bob.SyncAccounts(ctx))

// 	state, err := bob.GetAccountState(ctx, AccID(alice.repo.MustAccount().CID()))
// 	require.NoError(t, err)
// 	aliceFromBob, err := accountFromState(state)
// 	require.NoError(t, err)

// 	testutil.ProtoEqual(t, aliceAccount, aliceFromBob, "bob must get a profile update from alice")
// }

// func TestAccountVerifiedOnConnect(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	bob := makeTestBackend(t, "bob", true)
// 	ctx := context.Background()

// 	connectPeers(ctx, t, alice, bob, true)

// 	check := func(t *testing.T, local, remote *backend) {
// 		acc, err := local.GetAccountForDevice(ctx, DeviceID(remote.repo.Device().CID()))
// 		require.NoError(t, err)
// 		require.Equal(t, remote.repo.MustAccount().CID().String(), acc.String())

// 		accs, err := local.ListAccounts(ctx)
// 		require.NoError(t, err)
// 		require.Len(t, accs, 1)

// 		accsMap, err := local.ListAccountDevices(ctx)
// 		require.NoError(t, err)
// 		delete(accsMap, AccID(local.repo.MustAccount().CID()))
// 		require.Len(t, accs, 1)
// 	}

// 	check(t, alice, bob)
// 	check(t, bob, alice)
// }

// func TestRecoverConnections(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	bob := makeTestBackend(t, "bob", true)
// 	ctx := context.Background()

// 	connectPeers(ctx, t, alice, bob, true)

// 	ok := alice.p2p.libp2p.ConnManager().IsProtected(bob.repo.Device().ID(), protocolSupportKey)
// 	require.True(t, ok)
// 	ok = bob.p2p.libp2p.ConnManager().IsProtected(alice.repo.Device().ID(), protocolSupportKey)
// 	require.True(t, ok)

// 	alice.p2p.libp2p.ConnManager().Unprotect(bob.repo.Device().ID(), protocolSupportKey)
// 	ok = alice.p2p.libp2p.ConnManager().IsProtected(bob.repo.Device().ID(), protocolSupportKey)
// 	require.NoError(t, alice.p2p.libp2p.Network().ClosePeer(bob.repo.Device().ID()))
// 	require.False(t, ok)

// 	require.NoError(t, alice.SyncAccounts(ctx))
// 	ok = alice.p2p.libp2p.ConnManager().IsProtected(bob.repo.Device().ID(), protocolSupportKey)
// 	require.True(t, ok)
// }

// func TestProvideAccount(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	bob := makeTestBackend(t, "bob", true)

// 	carol := makeTestBackend(t, "carol", true)
// 	ctx := context.Background()

// 	connectPeers(ctx, t, alice, bob, true)
// 	connectPeers(ctx, t, bob, carol, true)

// 	var i int
// 	addrs := carol.p2p.libp2p.Routing.FindProvidersAsync(ctx, cid.Cid(alice.repo.MustAccount().CID()), 100)
// 	for range addrs {
// 		i++
// 	}

// 	require.Greater(t, i, 0, "carol must find alice's account via bob")
// }

func makeTestBackend(t *testing.T, name string, ready bool) *backend {
	t.Helper()

	tester := makeTester(t, name)
	repo := makeTestRepo(t, tester)

	var back *backend
	app := fxtest.New(t,
		fx.Supply(
			config.P2P{
				Addr:        "/ip4/0.0.0.0/tcp/0",
				NoRelay:     true,
				NoBootstrap: true,
				NoMetrics:   true,
			},
			repo,
		),
		fx.Provide(
			provideDatastore,
			provideSQLite,
			provideBackend,
		),
		fx.NopLogger,
		moduleP2P,
		fx.Populate(&back),
	)

	t.Cleanup(func() {
		err := app.Stop(context.Background())
		if !errors.Is(err, context.Canceled) {
			panic(err)
		}
	})

	if ready {
		_, err := vcstypes.Register(context.Background(), tester.Account, tester.Device, vcs.New(back.pool))
		require.NoError(t, err)
		require.NoError(t, repo.CommitAccount(tester.Account.PublicKey))
		_, err = repo.Account()
		require.NoError(t, err)
	}

	app.RequireStart()

	if ready {
		<-back.p2p.Ready()
	}

	return back
}

type Tester struct {
	Account core.KeyPair
	Device  core.KeyPair
}

func connectPeers(ctx context.Context, t *testing.T, a, b *backend, waitVerify bool) {
	t.Helper()

	if waitVerify {
		checkEvent := func(back *backend, want DeviceID) chan struct{} {
			c := make(chan interface{}, 10)
			done := make(chan struct{})

			go func() {
				for {
					select {
					case <-ctx.Done():
						return
					case evt, ok := <-c:
						if !ok {
							return
						}

						verified, ok := evt.(accountVerified)
						if !ok {
							continue
						}

						if verified.Device.Equals(want) {
							close(done)
							return
						}
					}
				}
			}()

			back.Notify(c)

			return done
		}

		adone := checkEvent(a, DeviceID(b.repo.Device().CID()))
		bdone := checkEvent(b, DeviceID(a.repo.Device().CID()))

		defer func() {
			<-adone
			<-bdone
		}()
	}

	anode, err := a.readyIPFS()
	require.NoError(t, err)

	bnode, err := b.readyIPFS()
	require.NoError(t, err)

	err = anode.libp2p.Connect(ctx, bnode.libp2p.AddrInfo())
	require.NoError(t, err)
}

func makeTester(t *testing.T, name string) Tester {
	t.Helper()

	core := coretest.NewTester(name)

	tt := Tester{
		Account: core.Account,
		Device:  core.Device,
	}

	return tt
}
