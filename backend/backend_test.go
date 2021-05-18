package backend

import (
	"context"
	"fmt"
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

func TestProvide(t *testing.T) {
	t.SkipNow()
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)
	carol := makeTestBackend(t, "carol", true)
	ctx := context.Background()

	connectPeers(t, ctx, alice, bob)
	connectPeers(t, ctx, bob, carol)

	fmt.Println("CONNECTED")

	time.Sleep(10 * time.Second)
	fmt.Println("Finding")
	addrs := carol.p2p.Routing.FindProvidersAsync(ctx, cid.Cid(alice.repo.acc.id), 100)
	for a := range addrs {
		fmt.Println(a)
	}

	fmt.Println("Start get block")
	blk, err := carol.p2p.BlockService.GetBlock(ctx, cid.Cid(alice.repo.acc.id))
	require.NoError(t, err)
	fmt.Println(blk)
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
			provideLifecycle,
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
	defer func() {
		app.RequireStart()
		if ready {
			<-back.ready
		}
	}()
	t.Cleanup(func() {
		app.RequireStop()
	})

	if ready {
		require.NoError(t, repo.CommitAccount(tester.Account))
		acc, err := repo.Account()
		require.NoError(t, err)
		require.NoError(t, back.register(context.Background(), newState(cid.Cid(acc.id), nil), tester.Binding))
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

	binfo := host.InfoFromHost(bnode.Host)
	err = anode.Host.Connect(ctx, *binfo)
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
