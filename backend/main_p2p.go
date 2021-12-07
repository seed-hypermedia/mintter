package backend

import (
	"context"
	"fmt"

	"mintter/backend/config"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfsutil"
	"mintter/backend/ipfsutil/providing"
	"mintter/backend/ipfsutil/sqlitebs"
	"mintter/backend/logging"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-blockservice"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/peerstore"
	"github.com/libp2p/go-libp2p-peerstore/pstoremem"
	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/fx"
)

var moduleP2P = fx.Options(
	fx.Provide(
		providePeerstore,
		provideLibp2p,
		provideBootstrapPeers,
		// provideBadgerBlockstore,
		provideSQLiteBlockstore,
		provideBitswap,
		provideBlockService,
		provideP2P,
	),
)

func provideBadgerBlockstore(store datastore.Batching) (blockstore.Blockstore, error) {
	return ipfsutil.NewBlockstore(store)
}

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

func provideBootstrapPeers(cfg config.P2P) ipfsutil.Bootstrappers {
	if cfg.NoBootstrap {
		return nil
	}

	return ipfsutil.DefaultBootstrapPeers()
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
func provideLibp2p(lc fx.Lifecycle, cfg config.P2P, ps peerstore.Peerstore, ds datastore.Batching, r *repo, boot ipfsutil.Bootstrappers) (*ipfsutil.Libp2p, error) {
	m := ipfsutil.NewLibp2pMetrics()

	opts := []libp2p.Option{
		libp2p.UserAgent(userAgent),
		libp2p.Peerstore(ps),
	}

	if !cfg.NoRelay {
		opts = append(opts,
			libp2p.EnableRelay(), // TODO: enable OptHop for public nodes.
			libp2p.EnableAutoRelay(),
			libp2p.DefaultStaticRelays(),
		)
	}

	if !cfg.NoTLS {
		opts = append(opts, libp2p.DefaultSecurity)
	}

	if !cfg.NoMetrics {
		opts = append(opts, libp2p.BandwidthReporter(m))
	}

	node, err := ipfsutil.NewLibp2pNode(r.Device().priv, ds, boot, opts...)
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

func provideBitswap(lc fx.Lifecycle, n *ipfsutil.Libp2p, bs blockstore.Blockstore) (*ipfsutil.Bitswap, error) {
	bswap, err := ipfsutil.NewBitswap(n.Host, n.Routing, bs)
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

func provideBlockService(bs blockstore.Blockstore, bswap *ipfsutil.Bitswap) (blockservice.BlockService, error) {
	blksvc := blockservice.New(bs, bswap)

	// No need to call Close() for block service, because it's only closing the exchange,
	// which it in fact doesn't own and should not be closing it. Exchange is closed inside the bitswap provide func.

	return blksvc, nil
}

func provideP2P(lc fx.Lifecycle, patches *patchStore, bs blockservice.BlockService, repo *repo, cfg config.P2P, libp2p *ipfsutil.Libp2p, boot ipfsutil.Bootstrappers) (*p2pNode, error) {
	prov, err := providing.New(repo.providingDBPath(), libp2p.Routing, makeStrategy(bs.Blockstore(), patches))
	if err != nil {
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}

	p2p := newP2PNode(cfg, logging.Logger("mintter/p2p", "debug"), bs, libp2p, prov, boot)

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return prov.Close()
		},
	})

	return p2p, nil
}

// makeStrategy creates a providing strategy that merges blocks from the block store
// and objects from the patch store.
func makeStrategy(bs blockstore.Blockstore, patches *patchStore) providing.Strategy {
	return func(ctx context.Context) (<-chan cid.Cid, error) {
		oc, err := patches.AllObjectsChan(ctx)
		if err != nil {
			return nil, err
		}

		bc, err := bs.AllKeysChan(ctx)
		if err != nil {
			return nil, err
		}

		out := make(chan cid.Cid)

		go func() {
			defer close(out)

			for c := range oc {
				out <- c
			}

			for c := range bc {
				out <- c
			}
		}()

		return out, nil
	}
}
