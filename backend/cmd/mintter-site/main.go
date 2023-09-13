// Program mintter-site implements the Hypermedia Site server.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"

	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon"
	accounts "mintter/backend/genproto/accounts/v1alpha"

	"github.com/burdiyan/go/mainutil"
	"github.com/peterbourgon/ff/v3"
)

func main() {
	const envVarPrefix = "MINTTER"

	mainutil.Run(func() error {
		ctx := mainutil.TrapSignals()

		fs := flag.NewFlagSet("mintter-site", flag.ExitOnError)
		fs.Usage = func() {
			fmt.Fprintf(fs.Output(), `Usage: %s ADDRESS [flags]

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

		// TODO(burdiyan): ignore http.port flag because it collides with the ADDRESS positional argument.
		cfg := config.Default()
		cfg.DataDir = "~/.mintter-site"
		cfg.BindFlags(fs)

		if len(os.Args) < 2 {
			fs.Usage()
			fmt.Fprintln(fs.Output(), "Error: Positional argument ADDRESS is missing.")
			os.Exit(2)
		}

		rawURL := os.Args[1]
		u, err := url.Parse(rawURL)
		if err != nil {
			return fmt.Errorf("failed to parse address: %w", err)
		}

		if u.Path != "" {
			return fmt.Errorf("address URL must not have a path: %s", rawURL)
		}

		if u.Scheme != "http" && u.Scheme != "https" {
			return fmt.Errorf("address URL only supports http or https, got = %s", rawURL)
		}

		if err := ff.Parse(fs, os.Args[2:], ff.WithEnvVarPrefix(envVarPrefix)); err != nil {
			return err
		}

		if err := cfg.Base.ExpandDataDir(); err != nil {
			return err
		}

		dir, err := daemon.InitRepo(cfg.Base.DataDir, nil)
		if err != nil {
			return err
		}

		app, err := daemon.LoadWithStorage(ctx, cfg, dir)
		if err != nil {
			return err
		}

		if _, ok := dir.Identity().Get(); !ok {
			account, err := core.NewKeyPairRandom()
			if err != nil {
				return fmt.Errorf("failed to generate random account key pair: %w", err)
			}

			if err := app.RPC.Daemon.RegisterAccount(ctx, account); err != nil {
				return fmt.Errorf("failed to create registration: %w", err)
			}
		}

		if _, err := app.RPC.Accounts.UpdateProfile(ctx, &accounts.Profile{
			Alias: rawURL + " Hypermedia Site",
		}); err != nil {
			return fmt.Errorf("failed to update profile: %w", err)
		}

		err = app.Wait()
		if errors.Is(err, context.Canceled) {
			return nil
		}

		return err
	})
}
