package backend

import (
	"context"
	"time"

	"go.uber.org/zap"

	daemon "mintter/backend/api/daemon/v1alpha"
	"mintter/backend/vcs"
)

type daemonAPI struct {
	*daemon.Server
}

func newDaemonAPI(back *backend, v *vcs.SQLite) daemon.DaemonServer {
	srv := daemon.NewServer(back.repo, v, func() {
		start := time.Now()
		back.log.Debug("ForceSyncStarted")
		err := back.SyncAccounts(context.Background())
		back.log.Debug("ForceSyncStopped", zap.Error(err), zap.Duration("elapsed", time.Since(start)))
	})

	return &daemonAPI{
		Server: srv,
	}
}
