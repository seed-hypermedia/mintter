package backend

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/libp2p/go-libp2p-core/event"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	accounts "mintter/api/go/accounts/v1alpha"
	daemon "mintter/api/go/daemon/v1alpha"
	"mintter/backend/badgergraph"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"
	"mintter/backend/testutil"
)

var _ daemon.DaemonServer = (*backend)(nil)

func TestGenSeed(t *testing.T) {
	srv := makeTestBackend(t, "alice", false)
	ctx := context.Background()

	resp, err := srv.backend.GenSeed(ctx, &daemon.GenSeedRequest{})
	require.NoError(t, err)
	require.Equal(t, aezeed.NummnemonicWords, len(resp.Mnemonic))
}

func TestRegister(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	srv := makeTestBackend(t, "alice", false)
	ctx := context.Background()

	resp, err := srv.backend.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: testMnemonic,
	})
	require.NoError(t, err)
	require.NotEqual(t, "", resp.AccountId)

	_, err = srv.backend.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: testMnemonic,
	})
	require.Error(t, err, "calling Register more than once must fail")

	stat, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.FailedPrecondition, stat.Code())

	acc, err := srv.backend.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err, "must get account after registration")
	require.NotNil(t, acc)
}

func TestRegister_Concurrent(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	srv := makeTestBackend(t, "alice", false)
	ctx := context.Background()
	c := 5

	errs := make(chan error, c-1) // one request must succeed

	for i := 0; i < 5; i++ {
		go func() {
			_, err := srv.backend.Register(ctx, &daemon.RegisterRequest{
				Mnemonic: testMnemonic,
			})
			if err != nil {
				errs <- err
			}
		}()
	}

	for i := 0; i < c-1; i++ {
		err := <-errs
		require.Error(t, err)
	}
}

func TestDialPeer(t *testing.T) {
	ctx := context.Background()
	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)

	sub, err := alice.p2p.host.EventBus().Subscribe(event.WildcardSubscription)
	require.NoError(t, err)
	defer sub.Close()

	go func() {
		for evt := range sub.Out() {
			e := evt.(event.EvtPeerIdentificationCompleted)
			fmt.Printf("%s - %T: %+v\n", time.Now(), evt, evt)
			protos, err := alice.p2p.host.Peerstore().GetProtocols(e.Peer)
			if err != nil {
				panic(err)
			}
			fmt.Println("Protocols:", protos)

		}
	}()

	fmt.Println(time.Now(), "Dialed")
	resp, err := alice.backend.DialPeer(ctx, &daemon.DialPeerRequest{
		Addrs: bob.Addrs(t),
	})
	require.NoError(t, err)
	require.NotNil(t, resp)

	time.Sleep(2 * time.Second)
}

type testBackend struct {
	backend *backend
	repo    *repo
	p2p     *p2pNode
}

func (tt *testBackend) Addrs(t *testing.T) []string {
	t.Helper()
	addrs, err := tt.p2p.Addrs()
	require.NoError(t, err)

	out := make([]string, len(addrs))

	for i, a := range addrs {
		out[i] = a.String()
	}

	return out
}

func makeTestBackend(t *testing.T, name string, ready bool) *testBackend {
	t.Helper()

	tester := makeTester(t, name)
	repo := makeTestRepo(t, tester)

	ds := testutil.MakeDatastore(t)
	p2p, err := newP2PNode(config.P2P{
		Addr:        "/ip4/127.0.0.1/tcp/0",
		NoBootstrap: true,
		NoRelay:     true,
		NoTLS:       true,
	}, ds, repo.Device().priv)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, p2p.Close())
	})

	bs := blockstore.NewBlockstore(ds)

	db, err := badgergraph.NewDB(testutil.MakeBadgerV3(t), "!mtttest")
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, db.Close())
	})

	patchStore, err := newPatchStore(repo.Device().priv, bs, db)
	require.NoError(t, err)
	srv := newBackend(repo, p2p, patchStore)

	if ready {
		require.NoError(t, repo.CommitAccount(tester.Account))
		acc, err := repo.Account()
		require.NoError(t, err)

		require.NoError(t, srv.register(context.Background(), newState(cid.Cid(acc.id), nil), tester.Binding))
	}

	return &testBackend{
		backend: srv,
		repo:    repo,
		p2p:     p2p,
	}
}

type Tester struct {
	Account Account
	Device  Device
	Binding AccountBinding
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
