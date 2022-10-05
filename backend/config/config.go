// Package config provides global configuration.
package config

import (
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Config for Mintter daemon. When adding or removing fields,
// adjust the DefaultConfig() and SetupFlags() accordingly.
type Config struct {
	HTTPPort int
	GRPCPort int
	RepoPath string

	Lndhub  Lndhub
	P2P     P2P
	Syncing Syncing
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

		P2P: P2P{
			Port:              55000,
			RelayBackoffDelay: 21600 * time.Minute,
			StaticRelayRescan: 1 * time.Minute,
		},

		Syncing: Syncing{
			WarmupDuration: time.Minute,
			Interval:       time.Minute,
			TimeoutPerPeer: time.Minute * 2,
		},
	}
}

// SetupFlags configures the given FlagSet with the existing values from the given Config
// and prepares the FlagSet to parse the flags into the Config.
func SetupFlags(fs *flag.FlagSet, cfg *Config) {
	fs.IntVar(&cfg.HTTPPort, "http-port", cfg.HTTPPort, "Port to expose HTTP Server (including grpc-web)")
	fs.IntVar(&cfg.GRPCPort, "grpc-port", cfg.GRPCPort, "Port to expose gRPC server")
	fs.StringVar(&cfg.RepoPath, "repo-path", cfg.RepoPath, "Path to where to store node data")

	fs.BoolVar(&cfg.Lndhub.Mainnet, "lndhub.mainnet", cfg.Lndhub.Mainnet, "Connect to the mainnet lndhub.go server")

	fs.IntVar(&cfg.P2P.Port, "p2p.port", cfg.P2P.Port, "Port to listen for incoming P2P connections")
	fs.BoolVar(&cfg.P2P.NoRelay, "p2p.no-relay", cfg.P2P.NoRelay, "Disable libp2p circuit relay")
	fs.BoolVar(&cfg.P2P.NoBootstrap, "p2p.no-bootstrap", cfg.P2P.NoBootstrap, "Disable IPFS bootstrapping")
	fs.StringVar(&cfg.P2P.BootstrapPeer, "p2p.bootstrap-peer", cfg.P2P.BootstrapPeer, "Custom bootstrapping peer address")
	fs.BoolVar(&cfg.P2P.NoMetrics, "p2p.no-metrics", cfg.P2P.NoMetrics, "Disable Prometheus metrics collection")
	fs.DurationVar(&cfg.P2P.RelayBackoffDelay, "p2p.relay-backoff-delay", cfg.P2P.RelayBackoffDelay, "The time in which the autorelay will prune a relay if it cannot connect to it")
	fs.DurationVar(&cfg.P2P.StaticRelayRescan, "p2p.static-relay-rescan", cfg.P2P.StaticRelayRescan, "The period for automatic static relay rescanning")
	fs.BoolVar(&cfg.P2P.ReportPrivateAddrs, "p2p.report-private-addrs", cfg.P2P.ReportPrivateAddrs, "If true the node will report/announce addresses within private IP ranges")

	fs.DurationVar(&cfg.Syncing.WarmupDuration, "syncing.warmup-duration", cfg.Syncing.WarmupDuration, "Time to wait before the first sync loop iteration")
	fs.DurationVar(&cfg.Syncing.Interval, "syncing.interval", cfg.Syncing.Interval, "Periodic interval at which sync loop is triggered")
	fs.DurationVar(&cfg.Syncing.TimeoutPerPeer, "syncing.timeout-per-peer", cfg.Syncing.TimeoutPerPeer, "Maximum duration for syncing with a single peer")
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

// Lndhub related config. For field descriptions see SetupFlags().
type Lndhub struct {
	Mainnet bool
}

// Syncing related config. For field descriptions see SetupFlags().
type Syncing struct {
	WarmupDuration time.Duration
	Interval       time.Duration
	TimeoutPerPeer time.Duration
}

// P2P configuration. For field descriptions see SetupFlags().
type P2P struct {
	Port               int
	NoRelay            bool
	NoBootstrap        bool
	BootstrapPeer      string
	NoMetrics          bool
	RelayBackoffDelay  time.Duration
	StaticRelayRescan  time.Duration
	ReportPrivateAddrs bool
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
