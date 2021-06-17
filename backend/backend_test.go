package backend

import (
	"context"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
	"go.uber.org/zap"

	"mintter/backend/badger3ds"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"
	"mintter/backend/testutil"
)

func TestAccountVerifiedOnConnect(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)
	ctx := context.Background()

	ac := make(chan interface{}, 2)

	alice.Subscribe(ac)
	bob.Subscribe(ac)

	out := make(chan accountVerified, 2)

	go func() {
		for evt := range ac {
			verified, ok := evt.(accountVerified)
			if !ok {
				continue
			}
			out <- verified
		}
	}()

	want := map[string]string{
		alice.repo.acc.id.String(): alice.repo.device.id.String(),
		bob.repo.acc.id.String():   bob.repo.device.id.String(),
	}

	connectPeers(t, ctx, alice, bob)

	// Both Alice and Bob must receive an event after identifying each other.

	verified := <-out
	require.Equal(t, want[verified.Account.String()], verified.Device.String())
	verified = <-out
	require.Equal(t, want[verified.Account.String()], verified.Device.String())

	bobacc, err := alice.GetAccountForDevice(bob.repo.device.id)
	require.NoError(t, err)
	require.Equal(t, bob.repo.acc.id.String(), bobacc.String())

	aliceacc, err := bob.GetAccountForDevice(alice.repo.device.id)
	require.NoError(t, err)
	require.Equal(t, alice.repo.acc.id.String(), aliceacc.String())

	accs, err := alice.ListAccounts(ctx)
	require.NoError(t, err)
	require.Len(t, accs, 2)

	accs, err = bob.ListAccounts(ctx)
	require.NoError(t, err)
	require.Len(t, accs, 2)
}

func TestProvideAccount(t *testing.T) {
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)
	carol := makeTestBackend(t, "carol", true)
	ctx := context.Background()

	connectPeers(t, ctx, alice, bob)
	connectPeers(t, ctx, bob, carol)

	time.Sleep(2 * time.Second)

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
	dsopts := badger3ds.DefaultOptions("")
	dsopts.InMemory = true

	ds, err := badger3ds.NewDatastore(dsopts)
	require.NoError(t, err)

	var back *backend
	app := fxtest.New(t,
		fx.Supply(
			zap.NewNop(),
			config.P2P{
				Addr:        "/ip4/0.0.0.0/tcp/0",
				NoTLS:       true,
				NoRelay:     true,
				NoBootstrap: true,
			},
			repo,
		),
		fx.Provide(
			func() datastore.Batching {
				return ds
			},
			provideBadger,
			provideBadgerGraph,
			newPatchStore,
			provideBackend,
		),
		fx.NopLogger,
		moduleP2P,
		fx.Populate(&back),
	)

	t.Cleanup(func() {
		err := app.Stop(context.Background())
		require.Equal(t, context.Canceled, err)
	})

	if ready {
		require.NoError(t, repo.CommitAccount(tester.Account))
		acc, err := repo.Account()
		require.NoError(t, err)
		require.NoError(t, back.register(context.Background(), newState(cid.Cid(acc.id), nil), tester.Binding))
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

func connectPeers(t *testing.T, ctx context.Context, a, b *backend) {
	t.Helper()

	anode, err := a.readyIPFS()
	require.NoError(t, err)

	bnode, err := b.readyIPFS()
	require.NoError(t, err)

	binfo := host.InfoFromHost(bnode.libp2p.Host)
	err = anode.libp2p.Connect(ctx, *binfo)
	require.NoError(t, err)
}

func makeTester(t *testing.T, name string) Tester {
	t.Helper()

	prof := testutil.MakeProfile(t, name)

	pubBytes, err := prof.Account.PubKey.Raw()
	require.NoError(t, err)

	aid, err := ipfsutil.NewCID(codecAccountID, multihash.IDENTITY, pubBytes)
	require.NoError(t, err)

	tt := Tester{
		Account: Account{
			id:   AccountID(aid),
			priv: prof.Account.PrivKey.PrivKey,
			pub:  prof.Account.PubKey.PubKey,
		},
		Device: Device{
			id:   DeviceID(peer.ToCid(prof.Peer.ID)),
			priv: prof.Peer.PrivKey.PrivKey,
			pub:  prof.Peer.PubKey.PubKey,
		},
	}

	binding, err := InviteDevice(tt.Account, tt.Device)
	require.NoError(t, err)

	tt.Binding = binding

	return tt
}
