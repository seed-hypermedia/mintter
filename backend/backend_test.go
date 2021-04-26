package backend

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/libp2p/go-libp2p-core/event"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	backend "mintter/api/go/backend/v1alpha"
	"mintter/backend/config"
	"mintter/backend/testutil"
)

var _ backend.BackendServer = (*backendServer)(nil)

func TestGenSeed(t *testing.T) {
	srv := makeTestBackendServer(t, "alice", false)
	ctx := context.Background()

	resp, err := srv.backend.GenSeed(ctx, &backend.GenSeedRequest{})
	require.NoError(t, err)
	require.Equal(t, aezeed.NummnemonicWords, len(resp.Mnemonic))
}

func TestBindAccount(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	srv := makeTestBackendServer(t, "alice", false)
	ctx := context.Background()

	resp, err := srv.backend.BindAccount(ctx, &backend.BindAccountRequest{
		Mnemonic: testMnemonic,
	})
	require.NoError(t, err)
	require.NotEqual(t, "", resp.AccountId)

	_, err = srv.backend.BindAccount(ctx, &backend.BindAccountRequest{
		Mnemonic: testMnemonic,
	})
	require.Error(t, err, "calling BindAccount more than once must fail")

	stat, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.FailedPrecondition, stat.Code())

	srv2 := newBackendServer(srv.repo, srv.p2p, srv.backend.store)
	_, err = srv2.BindAccount(ctx, &backend.BindAccountRequest{
		Mnemonic: testMnemonic,
	})
	require.Error(t, err, "backend must remember account initialization state")
}

func TestBindAccount_Concurrent(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	srv := makeTestBackendServer(t, "alice", false)
	ctx := context.Background()
	c := 5

	errs := make(chan error, c-1) // one request must succeed

	for i := 0; i < 5; i++ {
		go func() {
			_, err := srv.backend.BindAccount(ctx, &backend.BindAccountRequest{
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
	alice := makeTestBackendServer(t, "alice", true)
	bob := makeTestBackendServer(t, "bob", true)

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
	resp, err := alice.backend.DialPeer(ctx, &backend.DialPeerRequest{
		Addrs: bob.Addrs(t),
	})
	require.NoError(t, err)
	require.NotNil(t, resp)

	time.Sleep(2 * time.Second)
}

type testBackendServer struct {
	backend *backendServer
	repo    *repo
	p2p     *p2pNode
}

func (tt *testBackendServer) Addrs(t *testing.T) []string {
	t.Helper()
	addrs, err := tt.p2p.Addrs()
	require.NoError(t, err)

	out := make([]string, len(addrs))

	for i, a := range addrs {
		out[i] = a.String()
	}

	return out
}

func makeTestBackendServer(t *testing.T, name string, ready bool) *testBackendServer {
	t.Helper()

	repo := makeTestRepo(t)

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

	db := testutil.MakeBadgerV3(t)

	patchStore, err := newPatchStore(repo.Device().priv, bs, db)
	require.NoError(t, err)
	srv := newBackendServer(repo, p2p, patchStore)

	if ready {
		tester := makeTester(t, name)
		require.NoError(t, repo.CommitAccount(tester.Account.pub))
		acc, err := repo.Account()
		require.NoError(t, err)

		require.NoError(t, srv.register(context.Background(), newState(cid.Cid(acc.id), nil), tester.Binding))
	}

	return &testBackendServer{
		backend: srv,
		repo:    repo,
		p2p:     p2p,
	}
}
