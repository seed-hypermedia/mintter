package backend

import (
	"context"
	"fmt"

	"mintter/backend/config"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/ipfs/providing"
	"mintter/backend/ipfs/sqlitebs"
	"mintter/backend/logging"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-blockservice"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/peerstore"
	"github.com/libp2p/go-libp2p-peerstore/pstoremem"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/multiformats/go-multiaddr"
	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/fx"
)

var moduleP2P = fx.Options(
	fx.Provide(
		providePeerstore,
		provideLibp2p,
		provideBootstrapPeers,
		provideSQLiteBlockstore,
		provideBitswap,
		provideBlockService,
		provideP2P,
	),
)

func provideSQLiteBlockstore(pool *sqlitex.Pool) (bs blockstore.Blockstore, err error) {
	bs = sqlitebs.New(pool, sqlitebs.Config{
		TableName:       string(sqliteschema.IPFSBlocks),
		ColumnMultihash: string(sqliteschema.IPFSBlocksMultihash.ShortName()),
		ColumnCodec:     string(sqliteschema.IPFSBlocksCodec.ShortName()),
		ColumnData:      string(sqliteschema.IPFSBlocksData.ShortName()),
	})
	bs = blockstore.NewIdStore(bs)
	bs, err = blockstore.CachedBlockstore(context.Background(), bs, blockstore.DefaultCacheOpts())

	return bs, err
}

// provideBootstrapRelays hardcodes a list of relays to connect in case
// a node is not reachable from outside
func provideBootstrapRelays() ([]peer.AddrInfo, error) {
	relays := map[string][]string{
		"12D3KooWDEy9x2MkUtDMLwb38isNhWMap39xeKVqL8Wb9AHYPYM7": {
			"/ip4/18.158.173.157/tcp/4002",      // Julio's personal server
			"/ip4/18.158.173.157/udp/4002/quic", // Julio's personal server
			"/ip4/23.20.24.146/tcp/4002",        // Mintter prod server
			"/ip4/23.20.24.146/udp/4002/quic",   // Mintter prod server
			"/ip4/52.22.139.174/tcp/4002",       // Mintter test server
			"/ip4/52.22.139.174/udp/4002/quic",  // Mintter test server
		},
	}
	relaysInfo := []peer.AddrInfo{}

	for ID, Addrs := range relays {
		newID, err := peer.Decode(ID)
		if err != nil {
			return nil, err
		}
		newRelay := peer.AddrInfo{
			ID:    newID,
			Addrs: []multiaddr.Multiaddr{},
		}
		for _, addr := range Addrs {
			ma, err := multiaddr.NewMultiaddr(addr)
			if err != nil {
				return nil, err
			}
			newRelay.Addrs = append(newRelay.Addrs, ma)
		}
		relaysInfo = append(relaysInfo, newRelay)
	}
	return relaysInfo, nil
}

func provideBootstrapPeers(cfg config.P2P) ipfs.Bootstrappers {
	if cfg.NoBootstrap {
		return nil
	}

	return ipfs.DefaultBootstrapPeers()
}

func providePeerstore(lc fx.Lifecycle) (peerstore.Peerstore, error) {
	pstoremem, err := pstoremem.NewPeerstore()
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return pstoremem.Close()
		},
	})

	return nil, nil
}

// provideLibp2p assembles libp2p node ready to use. Listening must be started elsewhere.
func provideLibp2p(lc fx.Lifecycle, cfg config.P2P, ps peerstore.Peerstore, ds datastore.Batching, r *repo, boot ipfs.Bootstrappers) (*ipfs.Libp2p, error) {
	m := ipfs.NewLibp2pMetrics()

	opts := []libp2p.Option{
		libp2p.UserAgent(userAgent),
		libp2p.Peerstore(ps),
		libp2p.EnableNATService(),
	}

	if !cfg.NoRelay {
		realaysInfo, err := provideBootstrapRelays()
		if err != nil {
			return nil, err
		}
		opts = append(opts,
			libp2p.NATPortMap(),
			libp2p.EnableHolePunching(),
			libp2p.EnableNATService(),
			libp2p.EnableAutoRelay(autorelay.WithStaticRelays(realaysInfo)),
		)
	}

	if !cfg.NoMetrics {
		opts = append(opts, libp2p.BandwidthReporter(m))
	}

	node, err := ipfs.NewLibp2pNode(r.Device().priv, ds, boot, opts...)
	if err != nil {
		return nil, err
	}

	m.SetHost(node.Host)

	if !cfg.NoMetrics {
		prometheus.MustRegister(m)
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return node.Close()
		},
	})

	return node, nil
}

func provideBitswap(lc fx.Lifecycle, n *ipfs.Libp2p, bs blockstore.Blockstore) (*ipfs.Bitswap, error) {
	bswap, err := ipfs.NewBitswap(n.Host, n.Routing, bs)
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return bswap.Close()
		},
	})

	return bswap, nil
}

func provideBlockService(bs blockstore.Blockstore, bswap *ipfs.Bitswap) (blockservice.BlockService, error) {
	blksvc := blockservice.New(bs, bswap)

	// No need to call Close() for block service, because it's only closing the exchange,
	// which it in fact doesn't own and should not be closing it. Exchange is closed inside the bitswap provide func.

	return blksvc, nil
}

func provideP2P(lc fx.Lifecycle, bs blockservice.BlockService, repo *repo, cfg config.P2P, libp2p *ipfs.Libp2p, boot ipfs.Bootstrappers) (*p2pNode, error) {
	prov, err := providing.New(repo.providingDBPath(), libp2p.Routing, makeStrategy(bs.Blockstore()))
	if err != nil {
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}

	p2p := newP2PNode(cfg, logging.New("mintter/p2p", "debug"), bs, libp2p, prov, boot)

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return prov.Close()
		},
	})

	return p2p, nil
}

// makeStrategy creates a providing strategy that merges blocks from the block store
// and objects from the patch store.
func makeStrategy(bs blockstore.Blockstore) providing.Strategy {
	return func(ctx context.Context) (<-chan cid.Cid, error) {
		return bs.AllKeysChan(ctx)
	}
}
