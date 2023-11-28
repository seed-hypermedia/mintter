// Program mintter-site implements the Hypermedia Site server.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"

	"mintter/backend/cmd/mintter-site/sites"
	"mintter/backend/daemon/storage"

	"github.com/burdiyan/go/mainutil"
	"github.com/peterbourgon/ff/v3"
)

func main() {
	const envVarPrefix = "MINTTER"

	mainutil.Run(func() error {
		ctx := mainutil.TrapSignals()

		fs := flag.NewFlagSet("mintter-site", flag.ExitOnError)
		fs.Usage = func() {
			fmt.Fprintf(fs.Output(), `Usage: %s [flags] ADDRESS

This program is similar to our main mintterd program in a lot of ways, but has more suitable defaults for running on a server as site.

It requires one positional argument ADDRESS, which has to be a Web network address this site is supposed to be available at.
The address can be a DNS name, or an IP address, and it has to be a URL with a scheme and port (if applicable).
Examples:
  - http://127.0.0.1:42542
  - https://mintter.com
  - http://example.com

Flags:
`, fs.Name())
			fs.PrintDefaults()
		}

		cfg := sites.DefaultConfig()
		cfg.BindFlags(fs)
		if err := ff.Parse(fs, os.Args[1:], ff.WithEnvVarPrefix(envVarPrefix)); err != nil {
			return err
		}

		args := fs.Args()

		if len(args) != 1 {
			fs.Usage()
			fmt.Fprintf(fs.Output(), "Error: Positional argument ADDRESS is required.\n")
			os.Exit(1)
		}

		rawURL := args[0]

		if err := cfg.Base.ExpandDataDir(); err != nil {
			return err
		}

		dir, err := storage.InitRepo(cfg.Base.DataDir, nil)
		if err != nil {
			return err
		}

		app, err := sites.Load(ctx, rawURL, cfg, dir)
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
