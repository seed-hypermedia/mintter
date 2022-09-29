// Package ipfs provides a lightweight IPFS node.
// Some ideas are borrowed from https://github.com/hsanjuan/ipfs-lite, but here we
// care a bit more about error handling and graceful shutdown.
package ipfs

import (
	"context"
	"time"

	"github.com/ipfs/go-bitswap"
	"github.com/ipfs/go-bitswap/network"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-ipfs-provider/queue"
	"github.com/ipfs/go-ipfs-provider/simple"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/routing"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
	provider "github.com/ipfs/go-ipfs-provider"
	"github.com/multiformats/go-multiaddr"
	multihash "github.com/multiformats/go-multihash"
)

const defaultReprovideInterval = 12 * time.Hour

// NewBlock creates a new IPFS block using blake2 as the hash function.
// Apparently IPFS comunity is leaning towards using it in place of SHA256.
// It can panic if invalid codec is used, or data is bad (too large or whatever).
// Mostly it means that there's a bug somewhere.
func NewBlock(codec uint64, data []byte) blocks.Block {
	id, err := NewCID(codec, multihash.BLAKE2B_MIN+31, data)
	if err != nil {
		panic(err)
	}

	blk, err := blocks.NewBlockWithCid(data, id)
	if err != nil {
		panic(err)
	}

	return blk
}

// NewBlockstore creates a new Block Store from a given datastore.
// It adds caching and bloom-filters, in addition to support for ID hashed blocks.
func NewBlockstore(store datastore.Batching) (blockstore.Blockstore, error) {
	var bs blockstore.Blockstore
	bs = blockstore.NewBlockstore(store)
	bs = blockstore.NewIdStore(bs)
	return blockstore.CachedBlockstore(context.Background(), bs, blockstore.DefaultCacheOpts())
}

// StringAddrs converts a slice of multiaddrs into their string representation.
func StringAddrs(mas []multiaddr.Multiaddr) []string {
	out := make([]string, len(mas))

	for i, ma := range mas {
		out[i] = ma.String()
	}

	return out
}

// PeerIDFromCIDString converts a string-cid into Peer ID.
func PeerIDFromCIDString(s string) (peer.ID, error) {
	c, err := cid.Decode(s)
	if err != nil {
		return "", err
	}

	return peer.FromCid(c)
}

// Bitswap exposes the bitswap network and exchange interface.
type Bitswap struct {
	*bitswap.Bitswap
	Net network.BitSwapNetwork

	cancel context.CancelFunc
}

// NewBitswap creates a new Bitswap wrapper.
// Users must call Close() for shutdown.
func NewBitswap(host host.Host, rt routing.ContentRouting, bs blockstore.Blockstore) (*Bitswap, error) {
	net := network.NewFromIpfsHost(host, rt)
	ctx, cancel := context.WithCancel(context.Background())
	b := bitswap.New(ctx, net, bs, bitswap.ProvideEnabled(true))

	return &Bitswap{
		Bitswap: b,
		Net:     net,
		cancel:  cancel,
	}, nil
}

// Close closes bitswap.
func (b *Bitswap) Close() error {
	err := b.Bitswap.Close()
	b.cancel()
	return err
}

// ReprovidingStrategy is a function that returns a channel of CIDs to be reprovided.
type ReprovidingStrategy func(context.Context) (<-chan cid.Cid, error)

// NewProviderSystem creates a new provider.System. Users must call Run() to start and Close() to shutdown.
func NewProviderSystem(ds datastore.Datastore, rt routing.ContentRouting, strategy ReprovidingStrategy) (provider.System, error) {
	ctx := context.Background() // This will be canceled when Close() is called explicitly.
	q, err := queue.NewQueue(ctx, "provider-v1", ds)
	if err != nil {
		return nil, err
	}

	// No need to call q.Close() because provider will call it.
	// It's weird but this is how it works at the moment.

	prov := simple.NewProvider(ctx, q, rt)

	sp := simple.NewReprovider(ctx, defaultReprovideInterval, rt, simple.KeyChanFunc(strategy))

	return provider.NewSystem(prov, sp), nil
}
