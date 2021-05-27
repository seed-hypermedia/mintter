package backend

import (
	"context"

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
	fx.Provide(
		provideLibp2p,
		provideBootstrapPeers,
		ipfsutil.NewBlockstore,
		provideBitswap,
		provideReprovider,
		provideBlockService,
		provideP2P,
	),
)

func provideBootstrapPeers(cfg config.P2P) ipfsutil.Bootstrappers {
	if cfg.NoBootstrap {
		return nil
	}

	return ipfsutil.DefaultBootstrapPeers()
}

// provideLibp2p assembles libp2p node ready to use. Listening must be started elsewhere.
func provideLibp2p(lc *lifecycle, cfg config.P2P, ds datastore.Batching, r *repo, boot ipfsutil.Bootstrappers) (*ipfsutil.Libp2p, error) {
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

	node, err := ipfsutil.NewLibp2pNode(r.Device().priv, ds, boot, opts...)
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

func provideBitswap(lc *lifecycle, n *ipfsutil.Libp2p, bs blockstore.Blockstore) (*ipfsutil.Bitswap, error) {
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

func provideReprovider(lc *lifecycle, bs blockstore.Blockstore, ds datastore.Batching, n *ipfsutil.Libp2p) (provider.System, error) {
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

func provideBlockService(bs blockstore.Blockstore, bswap *ipfsutil.Bitswap) (blockservice.BlockService, error) {
	blksvc := blockservice.New(bs, bswap)

	// No need to call Close() for block service, because it's only closing the exchange,
	// which it in fact doesn't own and should not be closing it. Exchange is closed inside the bitswap provide func.

	return blksvc, nil
}

func provideP2P(log *zap.Logger, cfg config.P2P, libp2p *ipfsutil.Libp2p, boot ipfsutil.Bootstrappers) (*p2pNode, error) {
	p2p := newP2PNode(cfg, log.Named("p2p"), libp2p, boot)
	return p2p, nil
}
