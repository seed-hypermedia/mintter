package main

import (
	"context"
	"time"

	_ "expvar"
	_ "net/http/pprof"

	"mintter/backend/config"
	"mintter/backend/daemon"

	"github.com/alecthomas/kong"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
	"go.uber.org/fx"
)

// Version could be replaced by passing linker flags.
var Version = "<dev>"

func main() {
	var cfg config.Config

	kong.Parse(&cfg,
		kong.Name("mintterd"),
		kong.Resolvers(kongcli.EnvResolver("")),
		kong.Description("Version: "+Version),
	)

	mainutil.Run(func() error {
		app := fx.New(
			daemon.Module(cfg),
			fx.StopTimeout(1*time.Minute),
		)

		ctx := mainutil.TrapSignals()

		if err := app.Start(ctx); err != nil {
			return err
		}

		<-ctx.Done()

		return app.Stop(context.Background())
	})
}
