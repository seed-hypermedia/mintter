// Program mkdb is supposed to be executed with `go run` from the root of the repository.
// It will create a (more or less) deterministic snapshot of the current schema of our database,
// which we can then use in tests to verify our migration scripts actually end up where we want them to.
package main

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	"mintter/backend/daemon"
	"os"

	"github.com/burdiyan/go/mainutil"
)

func main() {
	mainutil.Run(run)
}

func run() error {
	ctx, cancel := context.WithCancel(mainutil.TrapSignals())
	defer cancel()

	alice := coretest.NewTester("alice")

	cfg := config.Default()
	cfg.P2P.NoRelay = true
	cfg.P2P.BootstrapPeers = nil
	cfg.RepoPath = "/tmp/mintter-test-db-snapshot"

	if err := os.RemoveAll(cfg.RepoPath); err != nil {
		return err
	}

	if err := os.MkdirAll(cfg.RepoPath, 0750); err != nil {
		return err
	}

	dir, err := daemon.InitRepo(cfg, alice.Device.Wrapped())
	if err != nil {
		return err
	}

	app, err := daemon.LoadWithStorage(ctx, cfg, dir)
	if err != nil {
		return err
	}

	if err := app.RPC.Daemon.RegisterAccount(ctx, alice.Account); err != nil {
		return err
	}

	cancel()

	err = app.Wait()
	fmt.Println("Database has been saved in:", cfg.RepoPath)
	if errors.Is(err, context.Canceled) {
		return nil
	}

	return err
}
