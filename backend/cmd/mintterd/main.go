package main

import (
	"context"
	"runtime"
	"time"

	"mintter/backend"
	"mintter/backend/config"

	"github.com/alecthomas/kong"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
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

	ctx := mainutil.TrapSignals()

	mainutil.Run(func() error {
		log := backend.NewLogger(cfg)
		defer log.Sync()

		app := backend.NewApp(cfg, log)

		if err := app.Start(ctx); err != nil {
			return err
		}

		<-ctx.Done()

		stopCtx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
		defer cancel()

		return app.Stop(stopCtx)
	})

	// d := backend.NewDaemon(cfg)

	// mainutil.Run(func() error {
	// 	return d.Run(ctx)
	// })
}
