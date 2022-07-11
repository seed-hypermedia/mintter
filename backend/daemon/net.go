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
	"golang.org/x/sync/errgroup"
)

// provideNetwork is an FX provider which lazily sets up the Mintter P2P Network node after the account registration is completed.
func provideNetwork(lc fx.Lifecycle, cfg config.Config, vcsh *vcs.SQLite, me *future.ReadOnly[core.Identity]) *future.ReadOnly[*mttnet.Node] {
	fut := future.New[*mttnet.Node]()

	ctx, cancel := context.WithCancel(context.Background())

	var g errgroup.Group

	g.Go(func() error {
		id, err := me.Await(ctx)
		if err != nil {
			return nil
		}

		// We assume registration already happened.
		perma := vcstypes.NewAccountPermanode(id.AccountID())
		blk, err := vcs.EncodeBlock(perma)
		if err != nil {
			return err
		}

		node, err := mttnet.New(cfg.P2P, vcsh, blk.Cid(), id, logging.New("mintter/network", "debug"))
		if err != nil {
			return err
		}

		g.Go(func() error {
			return node.Start(ctx)
		})

		<-node.Ready()

		if err := fut.Resolve(node); err != nil {
			return err
		}

		return nil
	})

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			cancel()
			return g.Wait()
		},
	})

	return fut.ReadOnly
}
