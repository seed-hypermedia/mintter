package daemon

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"

	"go.uber.org/fx"
)

func provideNetwork(lc fx.Lifecycle, cfg config.Config, vcsh *vcs.SQLite, me *future.ReadOnly[core.Identity]) *future.ReadOnly[*mttnet.Node] {
	fut := future.New[*mttnet.Node]()

	ctx, cancel := context.WithCancel(context.Background())

	errc := make(chan error, 1)

	go func() {
		id, err := me.Await(context.Background())
		if err != nil {
			panic(err)
		}

		// We assume registration already happened.
		perma := vcstypes.NewAccountPermanode(id.AccountID())
		blk, err := vcs.EncodeBlock(perma)
		if err != nil {
			panic(err)
		}

		node, err := mttnet.New(cfg.P2P, vcsh, blk.Cid(), id, logging.New("mintter/network", "debug"))
		if err != nil {
			panic(err)
		}

		go func() {
			errc <- node.Start(ctx)
		}()

		<-node.Ready()

		if err := fut.Resolve(node); err != nil {
			panic(err)
		}
	}()

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			cancel()
			return <-errc
		},
	})

	return fut.ReadOnly
}
