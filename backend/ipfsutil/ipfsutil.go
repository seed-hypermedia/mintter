// Package ipfsutil provides a lightweight IPFS node that can deal with IPLDs.
// Most of the content of this package is highly borrowed from https://github.com/hsanjuan/ipfs-lite.
// Some of the changes include better error handlling and graceful shutdown.
package ipfsutil

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"mintter/backend/cleanup"

	"github.com/ipfs/go-bitswap"
	"github.com/ipfs/go-bitswap/network"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-ipfs-provider/queue"
	"github.com/ipfs/go-ipfs-provider/simple"
	"github.com/ipfs/go-merkledag"
	"github.com/ipfs/go-unixfs/importer/balanced"
	"github.com/ipfs/go-unixfs/importer/helpers"
	"github.com/ipfs/go-unixfs/importer/trickle"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/routing"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p-kad-dht/dual"
	"go.uber.org/multierr"

	blockservice "github.com/ipfs/go-blockservice"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	chunker "github.com/ipfs/go-ipfs-chunker"
	offline "github.com/ipfs/go-ipfs-exchange-offline"
	provider "github.com/ipfs/go-ipfs-provider"
	format "github.com/ipfs/go-ipld-format"
	ufsio "github.com/ipfs/go-unixfs/io"
	"github.com/multiformats/go-multiaddr"
	multihash "github.com/multiformats/go-multihash"
)

const defaultReprovideInterval = 12 * time.Hour

// Config wraps configuration options for the Peer.
type Config struct {
	// The DAGService will not announce or retrieve blocks from the network
	Offline bool
	// ReprovideInterval sets how often to reprovide records to the DHT
	ReprovideInterval time.Duration

	Blockstore blockstore.Blockstore
}

func (cfg *Config) setDefaults() {
	if cfg.ReprovideInterval <= 0 {
		cfg.ReprovideInterval = defaultReprovideInterval
	}
}

// Node is a lightweight IPFS peer.
type Node struct {
	format.DAGService

	cfg *Config

	host  host.Host
	dht   routing.Routing
	store datastore.Batching

	bstore     *NetworkBlockStore
	reprovider provider.System
	cleanup    io.Closer
}

// New creates an IPFS-Lite Peer. It uses the given datastore, libp2p Host and
// Routing (usually the DHT). The Host and the Routing may be nil if
// config.Offline is set to true, as they are not used in that case. Peer
// implements the ipld.DAGService interface.
//
// Deprecated: Use separated functions for assembling each component explicitly.
func New(
	ctx context.Context,
	store datastore.Batching,
	host host.Host,
	dht routing.Routing,
	cfg *Config,
) (n *Node, err error) {
	if cfg == nil {
		cfg = &Config{}
	}

	cfg.setDefaults()

	var cleanup cleanup.Stack
	defer func() {
		// We have to close all the dependencies created until the error happened.
		// This is for convenience because otherwise we'd have to accept each dependency in the constructor.
		// If there's no error, the caller would have to manually close the returned Node.
		if err != nil {
			err = multierr.Append(err, cleanup.Close())
		}
	}()

	// Setup block store.
	var bs blockstore.Blockstore
	if cfg.Blockstore != nil {
		bs = cfg.Blockstore
	} else {
		bs, err = NewBlockstore(store)
		if err != nil {
			return nil, fmt.Errorf("failed to setup blockstore: %w", err)
		}
	}

	var blocksvc blockservice.BlockService
	{
		if cfg.Offline {
			blocksvc = blockservice.New(bs, offline.Exchange(bs))
		} else {
			bswapnet := network.NewFromIpfsHost(host, dht)
			bswap := bitswap.New(ctx, bswapnet, bs, bitswap.ProvideEnabled(true))

			cleanup.Add(bswap)

			blocksvc = blockservice.New(bs, bswap)
		}
	}

	cleanup.Add(blocksvc)

	var reprov provider.System
	{
		if cfg.Offline {
			reprov = provider.NewOfflineProvider()
		} else {
			queue, err := queue.NewQueue(ctx, "provider-v1", store)
			if err != nil {
				return nil, err
			}

			prov := simple.NewProvider(
				ctx,
				queue,
				dht,
			)

			sp := simple.NewReprovider(
				ctx,
				cfg.ReprovideInterval,
				dht,
				simple.NewBlockstoreProvider(bs),
			)

			reprov = provider.NewSystem(prov, sp)
			reprov.Run()
		}
	}
	cleanup.Add(reprov)

	n = &Node{
		DAGService: merkledag.NewDAGService(blocksvc),
		bstore:     NewNetworkBlockStore(blocksvc),
		reprovider: reprov,

		cfg:     cfg,
		host:    host,
		dht:     dht,
		store:   store,
		cleanup: &cleanup,
	}

	return n, nil
}

// Close the node gracefully.
func (p *Node) Close() error {
	return p.cleanup.Close()
}

// Bootstrap is an optional helper to connect to the given peers and bootstrap
// the Peer DHT (and Bitswap).
// This is a best-effort function, but it blocks. It will return an error
// if less than half of the given peers could be connected, or DHT bootstrap fails.
// It's fine to pass a list where some peers will not be reachable, but caller should
// handle the error however is required by the application (probably just log it).
//
// Deprecated: Use package-level Bootstrap function.
func (p *Node) Bootstrap(ctx context.Context, peers []peer.AddrInfo) (err error) {
	res := Bootstrap(ctx, p.host, p.dht, peers)
	if res.RoutingErr != nil || len(peers)/2 < int(res.NumFailedConnections) {
		return fmt.Errorf("less than half of the peers were connected")
	}

	return nil
}

// Session returns a session-based NodeGetter.
func (p *Node) Session(ctx context.Context) (format.NodeGetter, error) {
	ng := merkledag.NewSession(ctx, p.DAGService)
	if ng == p.DAGService {
		return nil, errors.New("DAGService doesn't support sessions")
	}
	return ng, nil
}

// AddParams contains all of the configurable parameters needed to specify the
// importing process of a file.
type AddParams struct {
	Layout    string
	Chunker   string
	RawLeaves bool
	Hidden    bool
	Shard     bool
	NoCopy    bool
	HashFun   string
}

// AddFile chunks and adds content to the DAGService from a reader. The content
// is stored as a UnixFS DAG (default for IPFS). It returns the root
// ipld.Node.
func (p *Node) AddFile(ctx context.Context, r io.Reader, params *AddParams) (format.Node, error) {
	if params == nil {
		params = &AddParams{}
	}
	if params.HashFun == "" {
		params.HashFun = "sha2-256"
	}

	prefix, err := merkledag.PrefixForCidVersion(1)
	if err != nil {
		return nil, fmt.Errorf("bad CID Version: %s", err)
	}

	hashFunCode, ok := multihash.Names[strings.ToLower(params.HashFun)]
	if !ok {
		return nil, fmt.Errorf("unrecognized hash function: %s", params.HashFun)
	}
	prefix.MhType = hashFunCode
	prefix.MhLength = -1

	dbp := helpers.DagBuilderParams{
		Dagserv:    p,
		RawLeaves:  params.RawLeaves,
		Maxlinks:   helpers.DefaultLinksPerBlock,
		NoCopy:     params.NoCopy,
		CidBuilder: &prefix,
	}

	chnk, err := chunker.FromString(r, params.Chunker)
	if err != nil {
		return nil, err
	}
	dbh, err := dbp.New(chnk)
	if err != nil {
		return nil, err
	}

	var n format.Node
	switch params.Layout {
	case "trickle":
		n, err = trickle.Layout(dbh)
	case "balanced", "":
		n, err = balanced.Layout(dbh)
	default:
		return nil, errors.New("invalid Layout")
	}
	return n, err
}

// GetFile returns a reader to a file as identified by its root CID. The file
// must have been added as a UnixFS DAG (default for IPFS).
func (p *Node) GetFile(ctx context.Context, c cid.Cid) (ufsio.ReadSeekCloser, error) {
	n, err := p.Get(ctx, c)
	if err != nil {
		return nil, err
	}
	return ufsio.NewDagReader(ctx, n, p)
}

// BlockStore offers access to the blockstore underlying the Peer's DAGService.
func (p *Node) BlockStore() *NetworkBlockStore {
	return p.bstore
}

// Provider returns the underlying provider system backed by the DHT.
func (p *Node) Provider() provider.System {
	return p.reprovider
}

// NewBlock creates a new IPFS block assuming data is dag-cbor. It uses
// blake2 as the hash function as looks like this is what the community is going for now.
func NewBlock(data []byte) (blocks.Block, error) {
	id, err := NewCID(cid.DagCBOR, multihash.BLAKE2B_MIN+31, data)
	if err != nil {
		return nil, err
	}

	return blocks.NewBlockWithCid(data, id)
}

// NewBlockstore creates a new Block Store from a given datastore.
// It adds caching and bloom-filters, in addition to support for ID hashed blocks.
func NewBlockstore(store datastore.Batching) (blockstore.Blockstore, error) {
	var bs blockstore.Blockstore
	bs = blockstore.NewBlockstore(store)
	bs = blockstore.NewIdStore(bs)
	return blockstore.CachedBlockstore(context.Background(), bs, blockstore.DefaultCacheOpts())
}

// StringAddrs convers a slice of multiaddrs into their string representation.
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
		Bitswap: b.(*bitswap.Bitswap),
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

// NewProviderSystem creates a new provider.System. Users must call Run() to start and Close() to shutdown.
func NewProviderSystem(bs blockstore.Blockstore, ds datastore.Datastore, rt routing.ContentRouting) (provider.System, error) {
	ctx := context.Background() // This will be canceled when Close() is called explicitly.
	q, err := queue.NewQueue(ctx, "provider-v1", ds)
	if err != nil {
		return nil, err
	}

	// No need to call q.Close() because provider will call it.
	// It's weird but this is how it works at the moment.

	prov := simple.NewProvider(ctx, q, rt)

	sp := simple.NewReprovider(ctx, defaultReprovideInterval, rt, simple.NewBlockstoreProvider(bs))

	return provider.NewSystem(prov, sp), nil
}

// WaitRouting blocks until the content routing is ready. It's best-effort.
func WaitRouting(ctx context.Context, rti routing.ContentRouting) error {
	var rt *dht.IpfsDHT

	switch d := rti.(type) {
	case *dht.IpfsDHT:
		rt = d
	case *dual.DHT:
		rt = d.WAN
	default:
		return nil
	}

	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	for rt.RoutingTable().Size() <= 0 {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			continue
		}
	}

	return nil
}
