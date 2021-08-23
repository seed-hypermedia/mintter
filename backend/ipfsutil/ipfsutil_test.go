package ipfsutil

import (
	"bytes"
	"context"
	"fmt"
	"io/ioutil"
	"testing"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/stretchr/testify/require"

	"github.com/ipfs/go-cid"
	datastore "github.com/ipfs/go-datastore"
	dssync "github.com/ipfs/go-datastore/sync"
	cbor "github.com/ipfs/go-ipld-cbor"
	multiaddr "github.com/multiformats/go-multiaddr"
	multihash "github.com/multiformats/go-multihash"
)

func TestDAG(t *testing.T) {
	ctx := context.Background()
	p1, p2 := setupPeers(t)

	m := map[string]string{
		"akey": "avalue",
	}

	codec := uint64(multihash.SHA2_256)
	node, err := cbor.WrapObject(m, codec, multihash.DefaultLengths[codec])
	require.NoError(t, err)

	t.Log("created node: ", node.Cid())
	err = p1.Add(ctx, node)
	require.NoError(t, err)

	_, err = p2.Get(ctx, node.Cid())
	require.NoError(t, err)

	err = p1.Remove(ctx, node.Cid())
	require.NoError(t, err)

	err = p2.Remove(ctx, node.Cid())
	require.NoError(t, err)

	ok, err := p1.BlockStore().Has(node.Cid())
	require.False(t, ok, "block must have been deleted")
	require.NoError(t, err)

	ok, err = p2.BlockStore().Has(node.Cid())
	require.False(t, ok, "block must have been deleted")
	require.NoError(t, err)
}

func TestSession(t *testing.T) {
	ctx := context.Background()
	p1, p2 := setupPeers(t)

	m := map[string]string{
		"akey": "avalue",
	}

	codec := uint64(multihash.SHA2_256)
	node, err := cbor.WrapObject(m, codec, multihash.DefaultLengths[codec])
	require.NoError(t, err)

	t.Log("created node: ", node.Cid())
	err = p1.Add(ctx, node)
	require.NoError(t, err)

	sesGetter, err := p2.Session(ctx)
	require.NoError(t, err)
	_, err = sesGetter.Get(ctx, node.Cid())
	require.NoError(t, err)
}

func TestFiles(t *testing.T) {
	p1, p2 := setupPeers(t)

	content := []byte("hola")
	buf := bytes.NewReader(content)
	n, err := p1.AddFile(context.Background(), buf, nil)
	require.NoError(t, err)

	rsc, err := p2.GetFile(context.Background(), n.Cid())
	require.NoError(t, err)

	defer rsc.Close()

	content2, err := ioutil.ReadAll(rsc)
	require.NoError(t, err)
	require.Equal(t, content, content2, "retrieved must be the same as put")
}

func TestNewCID(t *testing.T) {
	id, err := NewCID(cid.DagCBOR, multihash.BLAKE2B_MIN+31, []byte("hello world"))
	require.NoError(t, err)

	id2, err := cid.Cast(id.Bytes())
	require.NoError(t, err)

	require.True(t, id.Equals(id2))

	fmt.Printf("%X\n", id.Bytes())
	mh, _ := multihash.Decode(id.Hash())
	fmt.Printf("%X\n", mh.Digest)
}

func setupPeers(t *testing.T) (p1, p2 *Node) {
	t.Helper()

	ctx := context.Background()

	ds1 := dssync.MutexWrap(datastore.NewMapDatastore())
	ds2 := dssync.MutexWrap(datastore.NewMapDatastore())
	priv1, _, err := crypto.GenerateKeyPair(crypto.RSA, 2048)
	require.NoError(t, err)

	priv2, _, err := crypto.GenerateKeyPair(crypto.RSA, 2048)
	require.NoError(t, err)

	listen, err := multiaddr.NewMultiaddr("/ip4/0.0.0.0/tcp/0")
	require.NoError(t, err)

	h1, dht1, err := SetupLibp2p(
		ctx,
		priv1,
		[]multiaddr.Multiaddr{listen},
		nil,
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, dht1.Close())
		require.NoError(t, h1.Close())
	})

	pinfo1 := peer.AddrInfo{
		ID:    h1.ID(),
		Addrs: h1.Addrs(),
	}

	h2, dht2, err := SetupLibp2p(
		ctx,
		priv2,
		[]multiaddr.Multiaddr{listen},
		nil,
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, dht2.Close())
		require.NoError(t, h2.Close())
	})

	pinfo2 := peer.AddrInfo{
		ID:    h2.ID(),
		Addrs: h2.Addrs(),
	}

	p1, err = New(ctx, ds1, h1, dht1, nil)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, p1.Close())
	})

	p2, err = New(ctx, ds2, h2, dht2, nil)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, p2.Close())
	})

	require.NoError(t, p1.Bootstrap(ctx, []peer.AddrInfo{pinfo2}))
	require.NoError(t, p2.Bootstrap(ctx, []peer.AddrInfo{pinfo1}))

	return p1, p2
}
