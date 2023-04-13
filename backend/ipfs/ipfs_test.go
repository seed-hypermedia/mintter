package ipfs

import (
	"context"
	"encoding/json"
	"testing"

	blockstore "github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/sync"
	format "github.com/ipfs/go-ipld-format"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
)

var (
	akey = key(`"CAESQNXo6/umWsQoXAZ13REtd0BesPr2paY4SEhjaA9UuzEWUkE+/Tte18OgQqqbZzip9yaQ1ePQ8Wm6jJUr2pFFMoc="`)
	bkey = key(`"CAESQNHDw1Cp9rFiOdKfyrx+wBVzTcv9upV18O2s5CJO1fCJ10ROWmNXYFYiSnht8y7/yasNerO2fOObm+kNcxI9Sus="`)
	ckey = key(`"CAESQKqxw/q2HruIc7BxBygaoYoE3Nq0DCGSFMYQqOtpdn5SMR1H6HqnKMSgbCWC77Lldo5ODsqurRr48D1pfQxPPD0="`)
)

func TestBitSwap(t *testing.T) {
	alice := makePeer(t, akey)
	bob := makePeer(t, bkey)
	carol := makePeer(t, ckey)

	ctx := context.Background()
	b1 := NewBlock(cid.Raw, []byte("alice-block-1"))
	require.NoError(t, alice.bs.Put(ctx, b1))

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()), "alice must connect to bob")

	{
		_, err := bob.bs.Get(ctx, b1.Cid())

		require.True(t, format.IsNotFound(err), "bob must not have alice's block in his blockstore")

		fetched, err := bob.bitswap.GetBlock(ctx, b1.Cid())
		require.NoError(t, err)
		require.Equal(t, b1.RawData(), fetched.RawData(), "bob must fetch block from alice with bitswap")
	}

	require.NoError(t, carol.Connect(ctx, bob.AddrInfo()), "carol must connect to bob")
	{
		_, err := carol.bs.Get(ctx, b1.Cid())
		require.True(t, format.IsNotFound(err), "carol must not have alice's block in her blockstore")

		require.Equal(t, network.NotConnected, carol.Network().Connectedness(alice.ID()), "carol must not be connected with alice after connecting with bob")

		fetched, err := carol.bitswap.GetBlock(ctx, b1.Cid())
		require.NoError(t, err)
		require.Equal(t, b1.RawData(), fetched.RawData(), "carol must fetch alice's block via bob")
	}
}

type testNode struct {
	*Libp2p
	bs      blockstore.Blockstore
	bitswap *Bitswap
}

func makePeer(t *testing.T, k crypto.PrivKey) *testNode {
	ds := sync.MutexWrap(datastore.NewMapDatastore())

	t.Cleanup(func() { require.NoError(t, ds.Close()) })

	n, err := NewLibp2pNode(k, ds, nil)
	require.NoError(t, err)

	ma, err := multiaddr.NewMultiaddr("/ip4/0.0.0.0/tcp/0")
	require.NoError(t, err)

	bs := blockstore.NewBlockstore(ds)

	bitswap, err := NewBitswap(n, n.Routing, bs)
	require.NoError(t, err)

	t.Cleanup(func() { require.NoError(t, bitswap.Close()) })

	require.NoError(t, n.Network().Listen(ma))

	t.Cleanup(func() { require.NoError(t, n.Close()) })

	return &testNode{
		Libp2p:  n,
		bitswap: bitswap,
		bs:      bs,
	}
}

func key(k string) crypto.PrivKey {
	var data []byte
	if err := json.Unmarshal([]byte(k), &data); err != nil {
		panic(err)
	}

	key, err := crypto.UnmarshalPrivateKey(data)
	if err != nil {
		panic(err)
	}

	return key
}
