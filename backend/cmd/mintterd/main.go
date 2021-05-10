package main

import (
	"mintter/backend"
	"mintter/backend/config"

	"github.com/alecthomas/kong"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
)

func main() {
	var cfg config.Config

	kong.Parse(&cfg,
		kong.Name("mintterd"),
		kong.Resolvers(kongcli.EnvResolver("")),
		kong.Description("Version: "+backend.Version),
	)

	ctx := mainutil.TrapSignals()

	d := backend.NewDaemon(cfg)

	mainutil.Run(func() error {
		return d.Run(ctx)
	})
}
