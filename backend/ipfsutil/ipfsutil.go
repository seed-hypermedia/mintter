// Package ipfsutil provides a lightweight IPFS node that can deal with IPLDs.
// Most of the content of this package is highly borrowed from https://github.com/hsanjuan/ipfs-lite.
// Some of the changes include better error handlling and graceful shutdown.
package ipfsutil

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mintter/backend/cleanup"
	"strings"
	"sync"
	"time"

	"github.com/ipfs/go-bitswap"
	"github.com/ipfs/go-bitswap/network"
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
	"go.uber.org/multierr"

	blockservice "github.com/ipfs/go-blockservice"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	chunker "github.com/ipfs/go-ipfs-chunker"
	offline "github.com/ipfs/go-ipfs-exchange-offline"
	provider "github.com/ipfs/go-ipfs-provider"
	cbor "github.com/ipfs/go-ipld-cbor"
	ipld "github.com/ipfs/go-ipld-format"
	ufsio "github.com/ipfs/go-unixfs/io"
	multihash "github.com/multiformats/go-multihash"
)

func init() {
	ipld.Register(cid.DagProtobuf, merkledag.DecodeProtobufBlock)
	ipld.Register(cid.Raw, merkledag.DecodeRawBlock)
	ipld.Register(cid.DagCBOR, cbor.DecodeBlock) // need to decode CBOR
}

var (
	defaultReprovideInterval = 12 * time.Hour
)

// Config wraps configuration options for the Peer.
type Config struct {
	// The DAGService will not announce or retrieve blocks from the network
	Offline bool
	// ReprovideInterval sets how often to reprovide records to the DHT
	ReprovideInterval time.Duration
}

func (cfg *Config) setDefaults() {
	if cfg.ReprovideInterval <= 0 {
		cfg.ReprovideInterval = defaultReprovideInterval
	}
}

// Node is a lightweight IPFS peer.
type Node struct {
	ipld.DAGService

	cfg *Config

	host  host.Host
	dht   routing.Routing
	store datastore.Batching

	bstore     blockstore.Blockstore
	bserv      blockservice.BlockService
	reprovider provider.System
	cleanup    io.Closer
}

// New creates an IPFS-Lite Peer. It uses the given datastore, libp2p Host and
// Routing (usuall the DHT). The Host and the Routing may be nil if
// config.Offline is set to true, as they are not used in that case. Peer
// implements the ipld.DAGService interface.
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
	{
		bs = blockstore.NewBlockstore(store)
		bs = blockstore.NewIdStore(bs)
		bs, err = blockstore.CachedBlockstore(ctx, bs, blockstore.DefaultCacheOpts())
		if err != nil {
			return nil, fmt.Errorf("failed to setup block store: %w", err)
		}
	}

	var blocksvc blockservice.BlockService
	{
		if cfg.Offline {
			blocksvc = blockservice.New(bs, offline.Exchange(bs))
		} else {
			bswapnet := network.NewFromIpfsHost(host, dht)
			bswap := bitswap.New(ctx, bswapnet, bs)

			cleanup = append(cleanup, bswap)

			blocksvc = blockservice.New(bs, bswap)
		}
	}
	cleanup = append(cleanup, blocksvc)

	var reprov provider.System
	{
		if cfg.Offline {
			reprov = provider.NewOfflineProvider()
		} else {
			queue, err := queue.NewQueue(ctx, "repro", store)
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
	cleanup = append(cleanup, reprov)

	n = &Node{
		DAGService: merkledag.NewDAGService(blocksvc),
		bstore:     bs,
		bserv:      blocksvc,
		reprovider: reprov,

		cfg:     cfg,
		host:    host,
		dht:     dht,
		store:   store,
		cleanup: cleanup,
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
func (p *Node) Bootstrap(ctx context.Context, peers []peer.AddrInfo) (err error) {
	var wg sync.WaitGroup
	errsc := make(chan error, len(peers))

	for _, pinfo := range peers {
		wg.Add(1)
		go func(pinfo peer.AddrInfo) {
			defer wg.Done()
			err := p.host.Connect(ctx, pinfo)
			if err != nil {
				errsc <- err
				return
			}
		}(pinfo)
	}

	wg.Wait()
	close(errsc)

	var (
		numPeers = len(peers)
		numErrs  = len(errsc)
	)

	if numPeers/2 < numErrs {
		errs := make([]error, 0, len(errsc))
		for e := range errsc {
			errs = append(errs, e)
		}
		err = multierr.Append(err, fmt.Errorf("only connected to %d bootstrap peers out of %d: %w", numPeers-numErrs, numPeers, multierr.Combine(errs...)))
	}

	err = multierr.Append(err, p.dht.Bootstrap(ctx))

	return err
}

// Session returns a session-based NodeGetter.
func (p *Node) Session(ctx context.Context) (ipld.NodeGetter, error) {
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
func (p *Node) AddFile(ctx context.Context, r io.Reader, params *AddParams) (ipld.Node, error) {
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

	var n ipld.Node
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
func (p *Node) BlockStore() blockstore.Blockstore {
	return p.bstore
}
