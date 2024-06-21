// Program mkdb is supposed to be executed with `go run` from the root of the repository.
// It will create a (more or less) deterministic snapshot of the current schema of our database,
// which we can then use in tests to verify our migration scripts actually end up where we want them to.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"seed/backend/config"
	"seed/backend/core"
	"seed/backend/core/coretest"
	"seed/backend/daemon"
	"seed/backend/daemon/storage"

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
	cfg.Base.DataDir = "/tmp/seed-test-db-snapshot"

	if err := os.RemoveAll(cfg.Base.DataDir); err != nil {
		return err
	}

	if err := os.MkdirAll(cfg.Base.DataDir, 0750); err != nil {
		return err
	}

	dir, err := storage.Open(cfg.Base.DataDir, alice.Device.Wrapped(), core.NewMemoryKeyStore(), cfg.LogLevel)
	if err != nil {
		return err
	}
	defer dir.Close()

	if err := dir.KeyStore().StoreKey(ctx, "main", alice.Account); err != nil {
		return err
	}

	app, err := daemon.Load(ctx, cfg, dir)
	if err != nil {
		return err
	}

	cancel()

	err = app.Wait()
	fmt.Println("Database has been saved in:", cfg.Base.DataDir)
	if errors.Is(err, context.Canceled) {
		return nil
	}

	return err
}
