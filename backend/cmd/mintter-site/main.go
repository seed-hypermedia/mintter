// Program mintter-site implements the Hypermedia Site server.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"

	"github.com/burdiyan/go/mainutil"
	"github.com/multiformats/go-multiaddr"
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
		httpHandler := wellKnownHandler{
			net: f.ReadOnly,
		}
		app, err := daemon.Load(ctx, cfg, dir, daemon.GenericHandler{
			Path:    "/.well-known/hypermedia-site",
			Handler: &httpHandler,
			Mode:    daemon.RouteNav,
		})

		if err != nil {
			return err
		}

		httpHandler.net = app.Net
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

		err = app.Wait()
		if errors.Is(err, context.Canceled) {
			return nil
		}

		return err
	})
}

type wellKnownHandler struct {
	net *future.ReadOnly[*mttnet.Node]
}

func (wk *wellKnownHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")

	n, ok := wk.net.Get()
	if !ok {
		w.Header().Set("Retry-After", "30")
		http.Error(w, "P2P node is not ready yet", http.StatusServiceUnavailable)
		return
	}
	type publicInfo struct {
		// The PeerID of this P2P node.
		PeerID string `json:"peerId,omitempty"`

		// The addresses of this site node in multiaddr format.
		Addresses []multiaddr.Multiaddr `addresses:"peerId,omitempty"`
	}
	var info publicInfo
	info.Addresses = n.AddrInfo().Addrs
	info.PeerID = n.ID().DeviceKey().PeerID().String()

	data, err := json.Marshal(info)
	if err != nil {
		http.Error(w, "Failed to marshal site info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(data)
	if err != nil {
		return
	}
}
