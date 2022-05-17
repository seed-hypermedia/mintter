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
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"time"

	"go.uber.org/zap"
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
	log := logging.New("mintter/api", "debug")

	return Server{
		Accounts: accounts.NewServer(id, v),
		Daemon: daemon.NewServer(repo, v, func() error {
			net, ok := node.Get()
			if !ok {
				return fmt.Errorf("account is not initialized yet")
			}

			<-net.Ready()

			log := log.With(zap.Int64("traceID", time.Now().Unix()))

			go func() {
				log.Debug("ForceSyncStarted")
				res, err := net.Sync(context.Background())
				log.Debug("ForceSyncFinished",
					zap.Error(err),
					zap.Int("successes", res.NumSyncOK),
					zap.Int("failures", res.NumSyncFailed),
				)
			}()

			return nil
		}),
		Documents:  documents.NewServer(id, v.DB(), v),
		Networking: networking.NewServer(node),
	}
}
