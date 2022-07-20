// Package config provides global configuration.
package config

import "time"

// Config for Mintter daemon.
type Config struct {
	HTTPPort      string `help:"Port to expose HTTP server (including grpc-web)" default:"55001"`
	GRPCPort      string `help:"Port to expose gRPC server" default:"55002"`
	RepoPath      string `help:"Path to where to store node data" default:"~/.mtt"`
	NoOpenBrowser bool   `help:"If true - do not open the browser to access the UI"`

	P2P         P2P         `prefix:"p2p." embed:""`
	LetsEncrypt LetsEncrypt `prefix:"lets-encrypt." embed:""`
	Syncing     Syncing     `prefix:"syncing." embed:""`
}

type Syncing struct {
	WarmupDuration time.Duration `help:"Time to wait before the first sync loop iteration" default:"1m"`
	Interval       time.Duration `help:"How often sync loop is triggered" default:"1m"`
	TimeoutPerPeer time.Duration `help:"Maximum duration for syncing with a single peer" default:"5m"`
}

type LetsEncrypt struct {
	Domain string `help:"Domain that Let's Encrypt will generate the certificate for (required for SSL support)"`
	Email  string `help:"Email that Let's Encrypt will use for notifications (optional)"`
}

// P2P configuration.
type P2P struct {
	Port               int  `help:"Port to listen for incoming P2P connections" default:"55000"`
	NoRelay            bool `help:"Disable libp2p circuit relay"`
	NoBootstrap        bool `help:"Disable IPFS bootstrapping"`
	NoMetrics          bool `help:"Disable Prometheus metrics collection"`
	RelayBackoffDelay  int  `help:"The time in minutes the autorelay will prune a relay if it cannot connect to it" default:"21600"`
	ReportPrivateAddrs bool `help:"If true the node will report/announce addresses within private IP ranges" default:"false"`
}
