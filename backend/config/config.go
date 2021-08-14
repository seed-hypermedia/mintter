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
	LND         LND         `prefix:"lnd." embed:""`
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

type LND struct {
	UseNeutrino bool `help:"If using neutrino as a bitcoin backend. Bitcoind used otherwise."`

	// In case using a remote bitcoind as a backed, you must also provide
	// ZMQ socket which sends rawblock and rawtx notifications from bitcoind. By
	// default, lnd will attempt to automatically obtain this information, so this
	// likely won't need to be set (other than for a remote bitcoind instance).
	BitcoindRPCHost string `help:"Where the Bitcoind backend is running" default:"127.0.0.1"`
	BitcoindRPCUser string `help:"A valid user to use" default:"lnd"`
	BitcoindRPCPass string `help:"A valid password for bitcoind rpc authentication" default:"lndpass"`
	Zmqpubrawblock  string `help:"ZMQ socket which sends rawblock notifications from bitcoind" default:"tcp://127.0.0.1:28332"`
	Zmqpubrawtx     string `help:"ZMQ socket which sends rawtx notifications from bitcoind" default:"tcp://127.0.0.1:28333"`

	Network         string   `help:"Which network to use {mainnet,testnet,regtest (default)}."`
	LndDir          string   `help:"The base directory that contains lnd's data, logs, configuration file, etc."`
	RawRPCListeners []string `help:"Add an interface/port/socket to listen for RPC connections"`
	RawListeners    []string `help:"Add an interface/port to listen for peer connections"`

	// Adding an external IP will advertise your node to the network. This signals
	// that your node is available to accept incoming channels. If you don't wish to
	// advertise your node, this value doesn't need to be set. Unless specified
	// (with host:port notation), the default port (9735) will be added to the address.
	RawExternalIPs []string `help:"Add an ip:port to the list of local addresses we claim to listen on to peers. If a port is not specified, the default (9735) will be used regardless of other parameters"`

	// A list of domains for lnd to periodically resolve, and advertise the resolved
	// IPs for the backing node. This is useful for users that only have a dynamic IP,
	//or want to expose the node at a domain. externalhosts=my-node-domain.com
	ExternalHosts []string `help:"A set of hosts that should be periodically resolved to announce IPs for"`

	DisableListen  bool   `help:"Disable listening for incoming peer connections"`
	DisableRest    bool   `help:"Disable REST API"`
	NAT            bool   `help:"Toggle NAT traversal support (using either UPnP or NAT-PMP) to automatically advertise your external IP address to the network -- NOTE this does not support devices behind multiple NATs"`
	DebugLevel     string `help:"Logging level for all subsystems {trace, debug, info, warn, error, critical} -- You may also specify <global-level>,<subsystem>=<level>,<subsystem2>=<level>,... to set the log level for individual subsystems -- Use show to list available subsystems"`
	NoNetBootstrap bool   `help:"If true, then automatic network bootstrapping will not be attempted."`
	Alias          string `help:"The node alias. Used as a moniker by peers and intelligence services"`
	Color          string `help:"The color of the node in hex format (i.e. '#3399FF'). Used to customize node appearance in intelligence services"`
}
