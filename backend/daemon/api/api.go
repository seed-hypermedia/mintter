package api

import (
	"context"
	"fmt"
	"mintter/backend/core"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	documents "mintter/backend/daemon/api/documents/v1alpha"
	networking "mintter/backend/daemon/api/networking/v1alpha"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/syncing"
	"mintter/backend/vcs/vcsdb"
	"mintter/backend/wallet"

	"crawshaw.io/sqlite/sqlitex"
)

// Server combines all the daemon API services into one thing.
type Server struct {
	Accounts   *accounts.Server
	Daemon     *daemon.Server
	Documents  *documents.Server
	Networking *networking.Server
}

// New creates a new API server.
func New(
	id *future.ReadOnly[core.Identity],
	repo *ondisk.OnDisk,
	db *sqlitex.Pool,
	v *vcsdb.DB,
	node *future.ReadOnly[*mttnet.Node],
	sync *future.ReadOnly[*syncing.Service],
	wallet *wallet.Service,
) Server {
	doSync := func() error {
		s, ok := sync.Get()
		if !ok {
			return fmt.Errorf("account is not initialized yet")
		}

		go func() {
			if err := s.SyncAndLog(context.Background()); err != nil {
				panic("bug or fatal error during sync " + err.Error())
			}
		}()

		return nil
	}

	return Server{
		Accounts:   accounts.NewServer(id, v),
		Daemon:     daemon.NewServer(repo, v, wallet, doSync),
		Documents:  documents.NewServer(id, db, documents.NewProvider(node)),
		Networking: networking.NewServer(node),
	}
}
