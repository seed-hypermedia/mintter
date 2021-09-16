// Package config provides global configuration.
package config

// Config for Mintter daemon.
type Config struct {
	HTTPPort      string `help:"Port to expose HTTP server (including grpc-web)" default:"55001"`
	GRPCPort      string `help:"Port to expose gRPC server" default:"55002"`
	RepoPath      string `help:"Path to where to store node data" default:"~/.mtt"`
	NoOpenBrowser bool   `help:"If true - do not open the browser to access the UI"`

	P2P         P2P         `prefix:"p2p." embed:""`
	UI          UI          `prefix:"ui." embed:""`
	LetsEncrypt LetsEncrypt `prefix:"lets-encrypt." embed:""`
}

type LetsEncrypt struct {
	Domain string `help:"Domain that Let's Encrypt will generate the certificate for (required for SSL support)"`
	Email  string `help:"Email that Let's Encrypt will use for notifications (optional)"`
}

// P2P configuration.
type P2P struct {
	// TODO: make this a slice and add ip6 and quic addresses.
	Addr        string `help:"Address for binding p2p listener" default:"/ip4/0.0.0.0/tcp/55000"`
	NoTLS       bool   `help:"Disable TLS in libp2p"`
	NoRelay     bool   `help:"Disable libp2p circuit relay"`
	NoBootstrap bool   `help:"Disable IPFS bootstrapping"`
	NoMetrics   bool   `help:"Disable Prometheus metrics collection"`
}

// UI configuration for the node.
type UI struct {
	LogoURI     string `help:"URI of the primary logo image"`
	HomePageURI string `help:"URI of the home page"`
	AssetsPath  string `help:"Path to the bundled web app" default:"frontend/app/dist"`
}
