// Package config provides global configuration.
package config

// Config for Mintter daemon.
type Config struct {
	HTTPPort string `help:"Port to expose HTTP server (including grpc-web)" default:"55001"`
	GRPCPort string `help:"Port to expose gRPC server" default:"55002"`
	RepoPath string `help:"Path to where to store node data (default: ~/.mtt)"`

	P2P P2P `help:"P2P configuration" prefix:"p2p." embed:""`
}

// P2P configuration.
type P2P struct {
	Addr        string `help:"address for binding p2p listener" default:"/ip4/0.0.0.0/tcp/55000"`
	EnableTLS   bool   `help:"enable TLS security options" default:"false"`
	EnableRelay bool   `help:"enable circuit-relay for libp2p" default:"false"`
	Bootstrap   bool   `help:"start IPFS bootstrapping process" default:"false"`
}
