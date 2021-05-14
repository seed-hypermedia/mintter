package backend

import (
	"context"
	"path/filepath"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"go.uber.org/fx"

	"mintter/backend/badger3ds"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"
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

type libp2pIn struct {
	fx.In

	Config    config.P2P
	Datastore datastore.Batching
	Repo      *repo

	// These can be provided by ipfsutil.DHTModule.
	Bootstrappers ipfsutil.Bootstrappers
}

func provideLibp2p(lc fx.Lifecycle, in libp2pIn) (*ipfsutil.LibP2PNode, error) {
	opts := []libp2p.Option{
		libp2p.UserAgent(userAgent),
	}

	if !in.Config.NoRelay {
		opts = append(opts,
			libp2p.EnableRelay(), // TODO: enable OptHop for public nodes.
			libp2p.EnableAutoRelay(),
			libp2p.DefaultStaticRelays(),
		)
	}

	if !in.Config.NoTLS {
		opts = append(opts, libp2p.DefaultSecurity)
	}

	node, err := ipfsutil.NewLibP2PNode(in.Repo.Device().priv, in.Datastore, in.Bootstrappers, opts...)
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			mas, err := ipfsutil.ParseMultiaddrs([]string{in.Config.Addr}) // This will eventually be a slice of addrs.
			if err != nil {
				return err
			}

			// We explicitly start listening only when application starts.
			return node.Host.Network().Listen(mas...)
		},
		OnStop: func(context.Context) error {
			return node.Close()
		},
	})

	return node, nil
}
