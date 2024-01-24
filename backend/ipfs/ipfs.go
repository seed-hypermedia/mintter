// Package ipfs provides a lightweight IPFS node.
// Some ideas are borrowed from https://github.com/hsanjuan/ipfs-lite, but here we
// care a bit more about error handling and graceful shutdown.
package ipfs

import (
	"context"
	"time"

	"github.com/ipfs/boxo/bitswap"
	"github.com/ipfs/boxo/bitswap/network"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/routing"

	blockstore "github.com/ipfs/boxo/blockstore"
	provider "github.com/ipfs/boxo/provider"
	"github.com/multiformats/go-multiaddr"
	multihash "github.com/multiformats/go-multihash"

	quic "github.com/quic-go/quic-go"
	webtransport "github.com/quic-go/webtransport-go"
)

// Using to ensure direct dependency.
var _ = quic.AEADLimitReached
var _ = webtransport.WebTransportBufferedStreamRejectedErrorCode

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
// It also conveniently embeds the routing interface.
type Bitswap struct {
	*bitswap.Bitswap
	routing.ContentRouting
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
		Bitswap:        b,
		ContentRouting: rt,
		Net:            net,
		cancel:         cancel,
	}, nil
}

// Close closes bitswap.
func (b *Bitswap) Close() error {
	err := b.Bitswap.Close()
	b.cancel()
	return err
}

// NewProviderSystem creates a new provider.System. Users must call Run() to start and Close() to shutdown.
func NewProviderSystem(ds datastore.Batching, rt routing.ContentRouting, strategy provider.KeyChanFunc) (provider.System, error) {
	return provider.New(ds, provider.Online(rt), provider.KeyProvider(strategy), provider.ReproviderInterval(defaultReprovideInterval))
}
