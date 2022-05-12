package daemon

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"os"

	"crawshaw.io/sqlite/sqlitex"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func Module(cfg config.Config) fx.Option {
	return fx.Options(
		fx.Supply(cfg),
		fx.Logger(&fxLogger{zap.NewNop().Sugar()}), // sometimes we may want to pass real zap logger here.
		fx.Provide(
			ProvideRepo,
			ProvideAccount,
			ProvideSQLite,
			ProvideVCS,
			ProvideNetwork,
		),
	)
}

func ProvideRepo(cfg config.Config) (*ondisk.OnDisk, error) {
	r, err := ondisk.NewOnDisk(cfg.RepoPath, logging.New("mintter/repo", "debug"))
	if errors.Is(err, ondisk.ErrRepoMigrate) {
		fmt.Fprintf(os.Stderr, `
This version of the software has a backward-incompatible database change!
Please remove data inside %s or use a different repo path.
`, cfg.RepoPath)
		os.Exit(1)
	}
	return r, err
}

func ProvideAccount(repo *ondisk.OnDisk) (*future.ReadOnly[core.Identity], error) {
	fut := future.New[core.Identity]()

	go func() {
		<-repo.Ready()

		acc, err := repo.Account()
		if err != nil {
			panic(err)
		}

		if err := fut.Resolve(core.NewIdentity(acc.CID(), repo.Device())); err != nil {
			panic(err)
		}
	}()

	return fut.ReadOnly, nil
}

func ProvideSQLite(lc fx.Lifecycle, repo *ondisk.OnDisk) (*sqlitex.Pool, error) {
	pool, err := sqliteschema.Open(repo.SQLitePath(), 0, 16)
	if err != nil {
		return nil, err
	}

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	if err := sqliteschema.Migrate(conn); err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return pool.Close()
		},
	})

	return pool, nil
}

func ProvideVCS(db *sqlitex.Pool) *vcs.SQLite {
	return vcs.New(db)
}

func ProvideNetwork(lc fx.Lifecycle, cfg config.Config, vcsh *vcs.SQLite, repo *ondisk.OnDisk) (*future.ReadOnly[*mttnet.Node], error) {
	fut := future.New[*mttnet.Node]()

	log := logging.New("mintter/network", "debug")

	ctx, cancel := context.WithCancel(context.Background())

	errc := make(chan error, 1)

	go func() {
		errc <- func() error {
			select {
			case <-repo.Ready():
				acc, err := repo.Account()
				if err != nil {
					return err
				}

				me := core.NewIdentity(acc.CID(), repo.Device())

				// If we're here it means that account was already registered within the repo,
				// and our own account's permanode was stored. But we don't have access to it here.
				// Since account permanodes are deterministically derived from account ID we do exactly that here.
				perma := vcstypes.NewAccountPermanode(acc.CID())
				blk, err := vcs.EncodeBlock(perma)
				if err != nil {
					return err
				}

				node, err := mttnet.New(cfg.P2P, vcsh, blk.Cid(), me, log)
				if err != nil {
					return err
				}

				return fut.Resolve(node)
			case <-ctx.Done():
				return nil
			}
		}()
	}()

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			cancel()
			return <-errc
		},
	})

	return fut.ReadOnly, nil
}

func StartDaemon(lc fx.Lifecycle, cfg config.Config) error {
	// start grpc
	// start http
	// register handlers
	// start listeners

	return nil
}

type fxLogger struct {
	l *zap.SugaredLogger
}

func (l *fxLogger) Printf(msg string, args ...interface{}) {
	l.l.Debugf(msg, args...)
}
