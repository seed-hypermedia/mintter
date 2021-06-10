package backend

import (
	"context"
	"fmt"
	"path/filepath"

	"mintter/backend/config"
	"mintter/backend/ipfsutil"
	"mintter/backend/ipfsutil/providing"

	"github.com/ipfs/go-blockservice"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
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
func provideLibp2p(lc fx.Lifecycle, cfg config.P2P, ds datastore.Batching, r *repo, boot ipfsutil.Bootstrappers) (*ipfsutil.Libp2p, error) {
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

func provideP2P(lc fx.Lifecycle, log *zap.Logger, bs blockstore.Blockstore, repo *repo, cfg config.P2P, libp2p *ipfsutil.Libp2p, boot ipfsutil.Bootstrappers) (*p2pNode, error) {
	// TODO: provide real strategy for reproviding.
	prov, err := providing.New(filepath.Join(repo.path, "providing/provided.db"), libp2p.Routing, bs.AllKeysChan)
	if err != nil {
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}

	p2p := newP2PNode(cfg, log.Named("p2p"), libp2p, prov, boot)

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return prov.Close()
		},
	})

	return p2p, nil
}
