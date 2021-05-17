package main

import (
	"runtime"
	"time"

	"mintter/backend"
	"mintter/backend/config"

	"github.com/alecthomas/kong"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
	"go.uber.org/fx"
)

func main() {
	var cfg config.Config

	// Badger recommends setting high value for GOMAXPROCS to take advantage of higher IOPS on SSDs.
	runtime.GOMAXPROCS(128)

	kong.Parse(&cfg,
		kong.Name("mintterd"),
		kong.Resolvers(kongcli.EnvResolver("")),
		kong.Description("Version: "+backend.Version),
	)

	mainutil.Run(func() error {
		log := backend.NewLogger(cfg)
		defer log.Sync()

		app := fx.New(
			backend.Module(cfg, log),
			fx.StopTimeout(1*time.Minute),
		)

		app.Run()

		return nil
	})
}
