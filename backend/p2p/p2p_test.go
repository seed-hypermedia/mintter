package p2p_test

import (
	"context"
	"testing"

	"mintter/backend/config"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"mintter/backend/testutil"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestTransitiveFetch(t *testing.T) {
	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")
	carol := makeTestNode(t, "carol")
	ctx := context.Background()

	connectLibp2p(t, ctx, alice, bob)

	blkalice := newBlock(t, []byte("This is Alice!"))
	require.NoError(t, alice.IPFS().BlockStore().Put(blkalice))

	blkbob, err := bob.IPFS().BlockStore().Get(blkalice.Cid())
	require.NoError(t, err, "bob must be able to fetch block from alice")
	require.NotNil(t, blkbob)

	connectLibp2p(t, ctx, bob, carol)

	// Make sure Carol is not connected to Alice directly.
	require.NoError(t, carol.Host().Network().ClosePeer(alice.Host().ID()))

	blkcarol, err := carol.IPFS().BlockStore().Get(blkalice.Cid())
	require.NoError(t, err, "carol must be able to fetch alice's block via bob")
	require.NotNil(t, blkcarol)
}

func makeTestNode(t *testing.T, name string) *p2p.Node {
	t.Helper()

	repoPath := testutil.MakeRepoPath(t)
	prof := testutil.MakeProfile(t, name)
	s, err := store.Create(repoPath, prof)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	log, err := zap.NewDevelopment()
	require.NoError(t, err)

	n, err := p2p.NewNode(repoPath, s, log.Named(name), config.P2P{
		Addr:        "/ip4/127.0.0.1/tcp/0",
		NoBootstrap: true,
		NoRelay:     true,
		NoTLS:       true,
	})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, n.Close())
	})

	return n
}

func newBlock(t *testing.T, data []byte) blocks.Block {
	mh, err := multihash.Sum(data, multihash.SHA2_256, -1)
	require.NoError(t, err)

	blk, err := blocks.NewBlockWithCid(data, cid.NewCidV1(cid.Raw, mh))
	require.NoError(t, err)
	return blk
}

func connectLibp2p(t *testing.T, ctx context.Context, p1, p2 *p2p.Node) {
	addrs, err := p1.Addrs()
	require.NoError(t, err)

	infos, err := peer.AddrInfosFromP2pAddrs(addrs...)
	require.NoError(t, err)

	var done bool
	for _, i := range infos {
		if err := p2.Host().Connect(ctx, i); err == nil {
			done = true
			break
		}
	}
	if !done {
		t.Fatal("failed to connect peers")
	}
}
func connectPeers(t *testing.T, ctx context.Context, p1, p2 *p2p.Node) {
	t.Helper()

	addrs, err := p1.Addrs()
	require.NoError(t, err)
	require.NoError(t, p2.Connect(ctx, addrs...))
}
