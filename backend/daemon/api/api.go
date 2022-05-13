package api

import (
	"mintter/backend/core"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	documents "mintter/backend/daemon/api/documents/v1alpha"
	networking "mintter/backend/daemon/api/networking/v1alpha"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
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
	v *vcs.SQLite,
	node *future.ReadOnly[*mttnet.Node],
) Server {
	return Server{
		Accounts: accounts.NewServer(id, v),
		Daemon: daemon.NewServer(repo, v, func() {
			panic("BUG: TODO force sync func")
		}),
		Documents:  documents.NewServer(id, v.DB(), v),
		Networking: networking.NewServer(node),
	}
}
