// Package config provides global configuration.
package config

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"seed/backend/ipfs"
	"strings"
	"time"

	"github.com/multiformats/go-multiaddr"
)

// Base configuration.
type Base struct {
	DataDir  string
	LogLevel string
}

// BindFlags binds the flags to the given FlagSet.
func (c *Base) BindFlags(fs *flag.FlagSet) {
	fs.StringVar(&c.DataDir, "data-dir", c.DataDir, "Path to a directory where to store node data")
	fs.StringVar(&c.LogLevel, "log-level", c.LogLevel, "Log verbosity debug | info | warning | error")
}

// ExpandDataDir is used to expand the home directory in the data directory path.
func (c *Base) ExpandDataDir() error {
	// We allow homedir expansion in the repo path.
	if strings.HasPrefix(c.DataDir, "~") {
		homedir, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("failed to detect home directory: %w", err)
		}
		c.DataDir = strings.Replace(c.DataDir, "~", homedir, 1)
	}
	return nil
}

// Config for our daemon. When adding or removing fields,
// adjust the Default() and BindFlags() accordingly.
type Config struct {
	Base

	HTTP    HTTP
	GRPC    GRPC
	Lndhub  Lndhub
	P2P     P2P
	Syncing Syncing
}

// BindFlags configures the given FlagSet with the existing values from the given Config
// and prepares the FlagSet to parse the flags into the Config.
//
// This function is assumed to be called after some default values were set on the given config.
// These values will be used as default values in flags.
// See Default() for the default config values.
func (c *Config) BindFlags(fs *flag.FlagSet) {
	c.Base.BindFlags(fs)
	c.HTTP.BindFlags(fs)
	c.GRPC.BindFlags(fs)
	c.Lndhub.BindFlags(fs)
	c.P2P.BindFlags(fs)
	c.Syncing.BindFlags(fs)
}

// Default creates a new default config.
func Default() Config {
	return Config{
		Base: Base{
			DataDir:  "~/.mtt",
			LogLevel: "info",
		},
		HTTP: HTTP{
			Port: 55001,
		},
		GRPC: GRPC{
			Port: 55002,
		},
		Lndhub: Lndhub{
			Mainnet: false,
		},
		P2P: P2P{
			BootstrapPeers: ipfs.DefaultBootstrapPeers(),
			Port:           55000,
			RelayBackoff:   time.Minute * 3,
		},
		Syncing: Syncing{
			WarmupDuration:  time.Second * 20,
			Interval:        time.Minute,
			TimeoutPerPeer:  time.Minute * 5,
			RefreshInterval: time.Second * 50,
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

// HTTP configuration.
type HTTP struct {
	Port int
}

// BindFlags binds the flags to the given FlagSet.
func (c *HTTP) BindFlags(fs *flag.FlagSet) {
	fs.IntVar(&c.Port, "http.port", c.Port, "Port for the HTTP server (including grpc-web)")
}

// GRPC configuration.
type GRPC struct {
	Port int
}

// BindFlags binds the flags to the given FlagSet.
func (c *GRPC) BindFlags(fs *flag.FlagSet) {
	fs.IntVar(&c.Port, "grpc.port", c.Port, "Port for the gRPC server")
}

// Lndhub related config.
type Lndhub struct {
	Mainnet bool
}

// BindFlags binds the flags to the given FlagSet.
func (c *Lndhub) BindFlags(fs *flag.FlagSet) {
	fs.BoolVar(&c.Mainnet, "lndhub.mainnet", c.Mainnet, "Connect to the mainnet lndhub.go server")
}

// Syncing configuration.
type Syncing struct {
	WarmupDuration  time.Duration
	Interval        time.Duration
	TimeoutPerPeer  time.Duration
	RefreshInterval time.Duration
	NoPull          bool
	NoDiscovery     bool
	AllowPush       bool
}

// BindFlags binds the flags to the given FlagSet.
func (c *Syncing) BindFlags(fs *flag.FlagSet) {
	fs.DurationVar(&c.WarmupDuration, "syncing.warmup-duration", c.WarmupDuration, "Time to wait before the first sync loop iteration")
	fs.DurationVar(&c.Interval, "syncing.interval", c.Interval, "Periodic interval at which sync loop is triggered")
	fs.DurationVar(&c.TimeoutPerPeer, "syncing.timeout-per-peer", c.TimeoutPerPeer, "Maximum duration for syncing with a single peer")
	fs.DurationVar(&c.RefreshInterval, "syncing.refresh-interval", c.RefreshInterval, "Periodic interval at which list of peers to sync is refreshed from the database")
	fs.BoolVar(&c.AllowPush, "syncing.allow-push", c.AllowPush, "Allows direct content push. Anyone could force push content.")
	fs.BoolVar(&c.NoPull, "syncing.no-pull", c.NoPull, "Disables periodic content pulling")
	fs.BoolVar(&c.NoDiscovery, "syncing.no-discovery", c.NoDiscovery, "Disables the ability to discover content from other peers")
}

// P2P networking configuration.
type P2P struct {
	TestnetName             string
	Port                    int
	NoRelay                 bool
	BootstrapPeers          []multiaddr.Multiaddr
	ListenAddrs             []multiaddr.Multiaddr
	AnnounceAddrs           []multiaddr.Multiaddr
	ForceReachabilityPublic bool
	NoPrivateIps            bool
	NoMetrics               bool
	RelayBackoff            time.Duration
}

// BindFlags binds the flags to the given FlagSet.
func (p2p *P2P) BindFlags(fs *flag.FlagSet) {
	fs.StringVar(&p2p.TestnetName, "p2p.testnet-name", p2p.TestnetName, "Name of the testnet to use (empty for mainnet)")
	fs.IntVar(&p2p.Port, "p2p.port", p2p.Port, "Port to listen for incoming P2P connections")
	fs.BoolVar(&p2p.NoRelay, "p2p.no-relay", p2p.NoRelay, "Disable libp2p circuit relay")
	fs.Var(newAddrsFlag(p2p.BootstrapPeers, &p2p.BootstrapPeers), "p2p.bootstrap-peers", "Multiaddrs for bootstrap nodes (comma separated)")
	fs.Var(newAddrsFlag(p2p.ListenAddrs, &p2p.ListenAddrs), "p2p.listen-addrs", "Addresses to be listen at (comma separated multiaddresses format)")
	fs.Var(newAddrsFlag(p2p.AnnounceAddrs, &p2p.AnnounceAddrs), "p2p.announce-addrs", "Multiaddrs this node will announce as being reachable at (comma separated)")
	fs.BoolVar(&p2p.ForceReachabilityPublic, "p2p.force-reachability-public", p2p.ForceReachabilityPublic, "Force the node into thinking it's publicly reachable")
	fs.BoolVar(&p2p.NoPrivateIps, "p2p.no-private-ips", p2p.NoPrivateIps, "Avoid announcing private IP addresses (ignored when using -p2p.announce-addrs)")
	fs.BoolVar(&p2p.NoMetrics, "p2p.no-metrics", p2p.NoMetrics, "Disable Prometheus metrics collection")
	fs.DurationVar(&p2p.RelayBackoff, "p2p.relay-backoff", p2p.RelayBackoff, "The time the autorelay waits to reconnect after failing to obtain a reservation with a candidate")
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

	filename = filepath.Join(repoPath, "seed-daemon.conf")

	_, err = os.Lstat(filename)
	if err == nil {
		return filename, nil
	}

	if os.IsNotExist(err) {
		if err := os.WriteFile(filename, []byte(`# Config file for the seed-daemon program.
# You can set any CLI flags here, one per line with a space between key and value.
`), 0600); err != nil {
			return "", err
		}

		return filename, nil
	}

	return "", err
}
