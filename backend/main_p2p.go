package backend

import (
	"context"
	"path/filepath"

	"mintter/backend/badger3ds"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"

	"github.com/ipfs/go-blockservice"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	provider "github.com/ipfs/go-ipfs-provider"
	"github.com/libp2p/go-libp2p"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

var moduleP2P = fx.Options(
	fx.Provide(provideP2PConfig,
		provideLibp2p,
		ipfsutil.DefaultBootstrapPeers,
		provideDatastore,
		ipfsutil.NewBlockstore,
		provideBitswap,
		provideReprovider,
		provideBlockService,
		provideIPFS,
		provideP2P,
	),
)

func provideP2PConfig(cfg config.Config) config.P2P {
	return cfg.P2P
}

func provideDatastore(lc fx.Lifecycle, cfg config.Config) (datastore.Batching, error) {
	ds, err := badger3ds.NewDatastore(badger3ds.DefaultOptions(filepath.Join(cfg.RepoPath, "badger-v3")))
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			return ds.Close()
		},
	})

	return ds, nil
}

// provideLibp2p assembles libp2p node ready to use. Listening must be started elsewhere.
func provideLibp2p(lc fx.Lifecycle, cfg config.P2P, ds datastore.Batching, r *repo, boot ipfsutil.Bootstrappers) (*ipfsutil.LibP2PNode, error) {
	opts := []libp2p.Option{
		libp2p.UserAgent(userAgent),
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

	node, err := ipfsutil.NewLibP2PNode(r.Device().priv, ds, boot, opts...)
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return node.Close()
		},
	})

	return node, nil
}

func provideBitswap(lc fx.Lifecycle, n *ipfsutil.LibP2PNode, bs blockstore.Blockstore) (*ipfsutil.Bitswap, error) {
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

func provideReprovider(lc fx.Lifecycle, bs blockstore.Blockstore, ds datastore.Batching, n *ipfsutil.LibP2PNode) (provider.System, error) {
	sys, err := ipfsutil.NewProviderSystem(bs, ds, n.Routing)
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			sys.Run()
			return nil
		},
		OnStop: func(context.Context) error {
			return sys.Close()
		},
	})

	return sys, nil
}

func provideBlockService(lc fx.Lifecycle, bs blockstore.Blockstore, bswap *ipfsutil.Bitswap) (blockservice.BlockService, error) {
	blksvc := blockservice.New(bs, bswap)

	// No need to call Close() for block service, because it's only closing the exchange,
	// which it in fact doesn't own and should not be closing it. Exchange is closed inside the bitswap provide func.

	return blksvc, nil
}

func provideIPFS(n *ipfsutil.LibP2PNode, bs blockservice.BlockService, bswap *ipfsutil.Bitswap, prov provider.System) *ipfsutil.IPFS {
	return &ipfsutil.IPFS{
		Host:           n.Host,
		Routing:        n.Routing,
		Provider:       prov,
		BitswapNetwork: bswap.Net,
		Exchange:       bswap,
		BlockService:   bs,
	}
}

func provideP2P(lc fx.Lifecycle, log *zap.Logger, cfg config.P2P, node *ipfsutil.IPFS, repo *repo) (*p2pNode, error) {
	p2p := newP2PNode(node, repo)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			mas, err := ipfsutil.ParseMultiaddrs([]string{cfg.Addr}) // This will eventually be a slice of addrs.
			if err != nil {
				return err
			}

			go func() {
				if err := p2p.Start(ctx, mas...); err != nil && err != context.Canceled {
					panic(err) // This can only happen if there's a bug.
				}
				close(done)
				addrs, err := node.Host.Network().InterfaceListenAddresses()
				if err != nil {
					panic(err)
				}
				log.Info("P2PNodeStarted", zap.Any("addrs", addrs))
			}()

			return nil
		},
		OnStop: func(context.Context) error {
			cancel()
			<-done
			return nil
		},
	})

	return p2p, nil
}
