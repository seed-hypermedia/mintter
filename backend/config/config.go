// Package config provides global configuration.
package config

// Config for Mintter daemon.
type Config struct {
	HTTPPort         string `help:"Port to expose HTTP server (including grpc-web)" default:"55001"`
	HTTPSPort        string `help:"Port to expose HTTPS server" default:"443"`
	GRPCPort         string `help:"Port to expose gRPC server" default:"55002"`
	RepoPath         string `help:"Path to where to store node data" default:"~/.mtt"`
	NoOpenBrowser    bool   `help:"If true - do not open the browser to access the UI"`
	DisableTelemetry bool   `help:"Opt-out Telemetry (this actually helps Mintter developers)"`
	Domain           string `help:"Domain that Let's Encrypt will generate the certificate for (required for SSL support)"`

	P2P P2P `help:"P2P configuration" prefix:"p2p." embed:""`
	UI  UI  `help:"ui configuration" prefix:"ui." embed:""`
}

// P2P configuration.
type P2P struct {
	Addr        string `help:"address for binding p2p listener" default:"/ip4/0.0.0.0/tcp/55000"`
	NoTLS       bool   `help:"disable TLS in libp2p"`
	NoRelay     bool   `help:"disable libp2p circuit relay"`
	NoBootstrap bool   `help:"disable IPFS bootstrapping"`
}

// UI configuration for the node.
type UI struct {
	LogoURI     string `help:"uri of the primary logo image"`
	HomePageURI string `help:"uri of the home page"`
}
