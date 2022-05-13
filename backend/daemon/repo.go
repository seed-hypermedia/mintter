package daemon

import (
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/logging"
	"mintter/backend/pkg/future"
	"os"
)

func provideRepo(cfg config.Config) (*ondisk.OnDisk, error) {
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

func provideAccount(repo *ondisk.OnDisk) (*future.ReadOnly[core.Identity], error) {
	fut := future.New[core.Identity]()

	go func() {
		<-repo.Ready()
		acc, err := repo.Account()
		if err != nil {
			panic(err)
		}

		id := core.NewIdentity(acc.CID(), repo.Device())
		if err := fut.Resolve(id); err != nil {
			panic(err)
		}
	}()

	return fut.ReadOnly, nil
}
