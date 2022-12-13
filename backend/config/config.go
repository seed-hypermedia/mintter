// Package config provides global configuration.
package config

import (
	"flag"
	"fmt"
	"io/ioutil"
	"mintter/backend/ipfs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/multiformats/go-multiaddr"
)

// Config for Mintter daemon. When adding or removing fields,
// adjust the DefaultConfig() and SetupFlags() accordingly.
type Config struct {
	HTTPPort int
	GRPCPort int
	RepoPath string

	Identity Identity
	Lndhub   Lndhub
	P2P      P2P
	Syncing  Syncing
}

// Default creates a new default config.
func Default() Config {
	return Config{
		HTTPPort: 55001,
		GRPCPort: 55002,
		RepoPath: "~/.mtt",

		Lndhub: Lndhub{
			Mainnet: false,
		},

		Identity: Identity{
			DeviceKeyPath: "",
		},

		P2P: P2P{
			BootstrapPeers: ipfs.DefaultBootstrapPeers(),
			Port:           55000,
			RelayBackoff:   time.Minute * 3,
		},

		Syncing: Syncing{
			WarmupDuration: time.Minute,
			Interval:       time.Minute,
			TimeoutPerPeer: time.Minute * 2,
			InboundDisable: false,
		},
	}
}

type addrsFlag []multiaddr.Multiaddr

func (al *addrsFlag) String() string {
	if al == nil {
		return ""
	}

	var sb strings.Builder
	last := len(*al) - 1
	for i, addr := range *al {
		if _, err := sb.WriteString(addr.String()); err != nil {
			panic(err)
		}

		if i < last {
			sb.WriteRune(',')
		}
	}

	return sb.String()
}

func (al *addrsFlag) Set(s string) error {
	ss := strings.Split(s, ",")
	out := make([]multiaddr.Multiaddr, len(ss))

	for i, as := range ss {
		addr, err := multiaddr.NewMultiaddr(as)
		if err != nil {
			return err
		}
		out[i] = addr
	}

	*al = out
	return nil
}

func newAddrsFlag(val []multiaddr.Multiaddr, p *[]multiaddr.Multiaddr) flag.Value {
	*p = val
	return (*addrsFlag)(p)
}

// SetupFlags configures the given FlagSet with the existing values from the given Config
// and prepares the FlagSet to parse the flags into the Config.
//
// This function is assumed to be called after some default values were set on the given config.
// These values will be used as default values in flags.
// See Default() for the default config values.
func SetupFlags(fs *flag.FlagSet, cfg *Config) {
	fs.IntVar(&cfg.HTTPPort, "http-port", cfg.HTTPPort, "Port to expose HTTP Server (including grpc-web)")
	fs.IntVar(&cfg.GRPCPort, "grpc-port", cfg.GRPCPort, "Port to expose gRPC server")
	fs.StringVar(&cfg.RepoPath, "repo-path", cfg.RepoPath, "Path to where to store node data")

	fs.StringVar(&cfg.Identity.DeviceKeyPath, "identity.devicekey-path", cfg.Identity.DeviceKeyPath, "Path to to read fixed device private key from")

	fs.BoolVar(&cfg.Lndhub.Mainnet, "lndhub.mainnet", cfg.Lndhub.Mainnet, "Connect to the mainnet lndhub.go server")

	fs.IntVar(&cfg.P2P.Port, "p2p.port", cfg.P2P.Port, "Port to listen for incoming P2P connections")
	fs.BoolVar(&cfg.P2P.NoRelay, "p2p.no-relay", cfg.P2P.NoRelay, "Disable libp2p circuit relay")
	fs.Var(newAddrsFlag(cfg.P2P.BootstrapPeers, &cfg.P2P.BootstrapPeers), "p2p.bootstrap-peers", "Addresses for bootstrap nodes (comma separated)")
	fs.Var(newAddrsFlag(cfg.P2P.ExtraAddrs, &cfg.P2P.ExtraAddrs), "p2p.extra-addrs", "Add extra addresses to listen on (comma separated)")

	fs.BoolVar(&cfg.P2P.DisableListing, "p2p.disable-listing", cfg.P2P.DisableListing, "Disable listing documents when requested (stealth mode)")
	fs.BoolVar(&cfg.P2P.NoMetrics, "p2p.no-metrics", cfg.P2P.NoMetrics, "Disable Prometheus metrics collection")
	fs.DurationVar(&cfg.P2P.RelayBackoff, "p2p.relay-backoff", cfg.P2P.RelayBackoff, "The time the autorelay waits to reconnect after failing to obtain a reservation with a candidate")
	fs.DurationVar(&cfg.Syncing.WarmupDuration, "syncing.warmup-duration", cfg.Syncing.WarmupDuration, "Time to wait before the first sync loop iteration")
	fs.DurationVar(&cfg.Syncing.Interval, "syncing.interval", cfg.Syncing.Interval, "Periodic interval at which sync loop is triggered")
	fs.DurationVar(&cfg.Syncing.TimeoutPerPeer, "syncing.timeout-per-peer", cfg.Syncing.TimeoutPerPeer, "Maximum duration for syncing with a single peer")
	fs.BoolVar(&cfg.Syncing.InboundDisable, "syncing.disable-inbound", cfg.Syncing.InboundDisable, "Not syncing inbound content, only syncs to remote peers")

}

// ExpandRepoPath is used to expand the home directory in the repo path.
func (c *Config) ExpandRepoPath() error {
	// We allow homedir expansion in the repo path.
	if strings.HasPrefix(c.RepoPath, "~") {
		homedir, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("failed to detect home directory: %w", err)
		}
		c.RepoPath = strings.Replace(c.RepoPath, "~", homedir, 1)
	}
	return nil
}

// Identity related config. For field descriptions see SetupFlags().
type Identity struct {
	DeviceKeyPath string
}

// Lndhub related config. For field descriptions see SetupFlags().
type Lndhub struct {
	Mainnet bool
}

// Syncing related config. For field descriptions see SetupFlags().
type Syncing struct {
	WarmupDuration time.Duration
	Interval       time.Duration
	TimeoutPerPeer time.Duration
	// InboundDisable disables syncing content to the remote peer from our peer.
	// If false, then documents get synced in both directions.
	InboundDisable bool
}

// P2P configuration. For field descriptions see SetupFlags().
type P2P struct {
	Port           int
	NoRelay        bool
	NoDocumentsOut bool
	BootstrapPeers []multiaddr.Multiaddr
	DisableListing bool
	NoMetrics      bool
	RelayBackoff   time.Duration
	ExtraAddrs     []multiaddr.Multiaddr
}

// NoBootstrap indicates whether bootstrap nodes are configured.
func (p2p P2P) NoBootstrap() bool {
	return len(p2p.BootstrapPeers) == 0
}

// EnsureConfigFile makes sure a config file exist.
func EnsureConfigFile(repoPath string) (filename string, err error) {
	if !filepath.IsAbs(repoPath) {
		return "", fmt.Errorf("repo path must be an absolute path")
	}

	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return "", err
	}

	filename = filepath.Join(repoPath, "mintterd.conf")

	_, err = os.Lstat(filename)
	if err == nil {
		return filename, nil
	}

	if os.IsNotExist(err) {
		if err := ioutil.WriteFile(filename, []byte(`# Config file for the mintterd program.
# You can set any CLI flags here, one per line with a space between key and value.
`), 0600); err != nil {
			return "", err
		}

		return filename, nil
	}

	return "", err
}
