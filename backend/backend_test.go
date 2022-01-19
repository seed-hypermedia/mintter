package backend

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/ipfs/go-cid"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/stretchr/testify/require"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"

	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/config"
	"mintter/backend/testutil"
)

func TestAccountSync(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)
	ctx := context.Background()

	connectPeers(ctx, t, alice, bob, true)

	aliceAccount, err := alice.UpdateProfile(ctx, &accounts.Profile{
		Alias: "I just updated my profile",
	})
	require.NoError(t, err)

	require.NoError(t, bob.SyncAccounts(ctx))

	state, err := bob.GetAccountState(ctx, alice.repo.acc.id)
	require.NoError(t, err)
	aliceFromBob, err := accountFromState(state)
	require.NoError(t, err)

	testutil.ProtoEqual(t, aliceAccount, aliceFromBob, "bob must get a profile update from alice")
}

func TestAccountVerifiedOnConnect(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)
	ctx := context.Background()

	connectPeers(ctx, t, alice, bob, true)

	check := func(t *testing.T, local, remote *backend) {
		acc, err := local.GetAccountForDevice(ctx, remote.repo.device.id)
		require.NoError(t, err)
		require.Equal(t, remote.repo.acc.id.String(), acc.String())

		accs, err := local.ListAccounts(ctx)
		require.NoError(t, err)
		require.Len(t, accs, 1)

		accsMap, err := local.ListAccountDevices(ctx)
		require.NoError(t, err)
		delete(accsMap, local.repo.acc.id)
		require.Len(t, accs, 1)
	}

	check(t, alice, bob)
	check(t, bob, alice)
}

func TestRecoverConnections(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)
	ctx := context.Background()

	connectPeers(ctx, t, alice, bob, true)

	ok := alice.p2p.libp2p.ConnManager().IsProtected(bob.repo.device.id.PeerID(), protocolSupportKey)
	require.True(t, ok)
	ok = bob.p2p.libp2p.ConnManager().IsProtected(alice.repo.device.id.PeerID(), protocolSupportKey)
	require.True(t, ok)

	alice.p2p.libp2p.ConnManager().Unprotect(bob.repo.device.id.PeerID(), protocolSupportKey)
	ok = alice.p2p.libp2p.ConnManager().IsProtected(bob.repo.device.id.PeerID(), protocolSupportKey)
	require.NoError(t, alice.p2p.libp2p.Network().ClosePeer(bob.repo.device.id.PeerID()))
	require.False(t, ok)

	require.NoError(t, alice.SyncAccounts(ctx))
	ok = alice.p2p.libp2p.ConnManager().IsProtected(bob.repo.device.id.PeerID(), protocolSupportKey)
	require.True(t, ok)
}

func TestProvideAccount(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)

	carol := makeTestBackend(t, "carol", true)
	ctx := context.Background()

	connectPeers(ctx, t, alice, bob, true)
	connectPeers(ctx, t, bob, carol, true)

	var i int
	addrs := carol.p2p.libp2p.Routing.FindProvidersAsync(ctx, cid.Cid(alice.repo.acc.id), 100)
	for range addrs {
		i++
	}

	require.Greater(t, i, 0, "carol must find alice's account via bob")
}

func makeTestBackend(t *testing.T, name string, ready bool) *backend {
	t.Helper()

	tester := makeTester(t, name)
	repo := makeTestRepo(t, tester)

	var back *backend
	app := fxtest.New(t,
		fx.Supply(
			config.P2P{
				Addr:        "/ip4/0.0.0.0/tcp/0",
				NoTLS:       true,
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
		require.NoError(t, repo.CommitAccount(tester.Account))
		acc, err := repo.Account()
		require.NoError(t, err)
		require.NoError(t, back.register(context.Background(), newChangeset(cid.Cid(acc.id), nil), tester.Binding))
	}

	app.RequireStart()

	if ready {
		<-back.p2p.Ready()
	}

	return back
}

type Tester struct {
	Account Account
	Device  Device
	Binding AccountBinding
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

		adone := checkEvent(a, b.repo.device.id)
		bdone := checkEvent(b, a.repo.device.id)

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

// JSON-stringified private keys.
var fakeUsers = map[string]struct {
	Account string
	Device  string
}{
	"alice": {
		Account: `"CAESQPp+QNO5NNWKgfAx1wgAj+iOISKrENspgGZzvDsnR3y46s9aB771DRwM6ovuJppSNu+5mwyQM0GPrDClxyL+GWA="`,
		Device:  `"CAESQNXo6/umWsQoXAZ13REtd0BesPr2paY4SEhjaA9UuzEWUkE+/Tte18OgQqqbZzip9yaQ1ePQ8Wm6jJUr2pFFMoc="`,
	},
	"bob": {
		Account: `"CAESQO89km7Cis1PMBoBV3MHx3JNO4XdtN5a+y+OgIL4klX3QEmTQlKDerpf6r90ERxIlUaPTX9uPb5fQwJbUsZX228="`,
		Device:  `"CAESQNHDw1Cp9rFiOdKfyrx+wBVzTcv9upV18O2s5CJO1fCJ10ROWmNXYFYiSnht8y7/yasNerO2fOObm+kNcxI9Sus="`,
	},
	"carol": {
		Account: `"CAESQBDN9IeKt2dZu5KbT3+U4LKdOavRGl2gE3HnWlRhxzBTmjYh916I2c8+j67TeHpO1RPjB4rqFszswTCWDIVvh3U="`,
		Device:  `"CAESQKqxw/q2HruIc7BxBygaoYoE3Nq0DCGSFMYQqOtpdn5SMR1H6HqnKMSgbCWC77Lldo5ODsqurRr48D1pfQxPPD0="`,
	},
	"derek": {
		Account: `"CAESQAmQsZC/oEbMLxv9ajRBpdcSinMfhfIeDKqFP3WlWs3jHguezw8JydB/vFIFPiyAUCRLCM5zgiO9ds0GXx1C518="`,
		Device:  `"CAESQNW0CDuhSw9c1F7hUlELIMg+Lr5peQ6wa8NxmbDGo9fiTy7X5IWZDo40cxVJynnM3zV1pOH4aueXtPZriePUYow="`,
	},
}

func makeTester(t *testing.T, name string) Tester {
	t.Helper()

	prof, ok := fakeUsers[name]
	if !ok {
		t.Fatalf("no fake profile with name %s", name)
	}

	var apriv crypto.PrivKey
	{
		var data []byte
		require.NoError(t, json.Unmarshal([]byte(prof.Account), &data))

		k, err := crypto.UnmarshalPrivateKey(data)
		require.NoError(t, err)
		apriv = k
	}

	var dpriv crypto.PrivKey
	{
		var data []byte
		require.NoError(t, json.Unmarshal([]byte(prof.Device), &data))

		k, err := crypto.UnmarshalPrivateKey(data)
		require.NoError(t, err)
		dpriv = k
	}

	device, err := NewDevice(dpriv)
	require.NoError(t, err)

	acc, err := NewAccount(apriv)
	require.NoError(t, err)

	tt := Tester{
		Account: acc,
		Device:  device,
	}

	binding, err := InviteDevice(tt.Account, tt.Device)
	require.NoError(t, err)

	tt.Binding = binding

	return tt
}
