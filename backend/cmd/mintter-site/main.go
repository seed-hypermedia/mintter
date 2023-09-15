// Program mintter-site implements the Hypermedia Site server.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"

	"mintter/backend/cmd/mintter-site/sites"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"

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

		cfg := config.Default()
		cfg.DataDir = "~/.mintter-site"
		cfg.Syncing.Disabled = true
		cfg.P2P.ForceReachabilityPublic = true
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

		cfg.P2P.AnnounceAddrs = must.Do2(
			ipfs.ParseMultiaddrs(
				ipfs.DefaultListenAddrsDNS(u.Hostname(), cfg.P2P.Port)))

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
		f := future.New[*mttnet.Node]()
		site := sites.Website{
			Net: f.ReadOnly,
			URL: rawURL,
		}
		app, err := daemon.Load(ctx, cfg, dir, daemon.GenericHandler{
			Path:    "/.well-known/hypermedia-site",
			Handler: &site,
			Mode:    daemon.RouteNav,
		})

		if err != nil {
			return err
		}

		site.Net = app.Net
		site.DB = app.DB
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
			Alias: rawURL,
			Bio:   "Hypermedia Site. Powered by Mintter.",
		}); err != nil {
			return fmt.Errorf("failed to update profile: %w", err)
		}
		if _, err := site.RegisterSite(ctx, rawURL); err != nil {
			return fmt.Errorf("failed to Register site: %w", err)
		}

		err = app.Wait()
		if errors.Is(err, context.Canceled) {
			return nil
		}

		return err
	})
}
