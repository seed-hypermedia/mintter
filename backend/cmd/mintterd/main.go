package main

import (
	"context"
	"errors"

	_ "expvar"
	_ "net/http/pprof"

	"mintter/backend/config"
	"mintter/backend/daemon"

	"github.com/alecthomas/kong"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
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
		ctx := mainutil.TrapSignals()

		app, err := daemon.Load(ctx, cfg)
		if err != nil {
			return err
		}

		err = app.Wait()
		if errors.Is(err, context.Canceled) {
			return nil
		}

		return err
	})
}
