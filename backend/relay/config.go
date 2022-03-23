package relay

import (
	"encoding/json"
	"os"
	"time"

	relayv1 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay"
	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
)

type Config struct {
	Network networkConfig
	ConnMgr connMgrConfig
	RelayV1 relayV1Config
	RelayV2 relayV2Config
	ACL     aclConfig
	Daemon  daemonConfig
}

type daemonConfig struct {
	PprofPort int
}

type networkConfig struct {
	ListenAddrs   []string
	AnnounceAddrs []string
}

type connMgrConfig struct {
	ConnMgrLo    int
	ConnMgrHi    int
	ConnMgrGrace time.Duration
}

type relayV1Config struct {
	Enabled   bool
	Resources relayv1.Resources
}

type relayV2Config struct {
	Enabled   bool
	Resources relayv2.Resources
}

type aclConfig struct {
	AllowPeers   []string
	AllowSubnets []string
}

func defaultConfig() Config {
	return Config{
		Network: networkConfig{
			ListenAddrs: []string{
				"/ip4/0.0.0.0/udp/4001/quic",
				"/ip6/::/udp/4001/quic",
				"/ip4/0.0.0.0/tcp/4001",
				"/ip6/::/tcp/4001",
			},
		},
		ConnMgr: connMgrConfig{
			ConnMgrLo:    512,
			ConnMgrHi:    768,
			ConnMgrGrace: 2 * time.Minute,
		},
		RelayV1: relayV1Config{
			Enabled:   false,
			Resources: relayv1.DefaultResources(),
		},
		RelayV2: relayV2Config{
			Enabled:   true,
			Resources: relayv2.DefaultResources(),
		},
		Daemon: daemonConfig{
			PprofPort: 6060,
		},
	}
}

func LoadConfig(cfgPath string) (Config, error) {
	cfg := defaultConfig()

	if cfgPath != "" {
		cfgFile, err := os.Open(cfgPath)
		if err != nil {
			return Config{}, err
		}
		defer cfgFile.Close()

		decoder := json.NewDecoder(cfgFile)
		err = decoder.Decode(&cfg)
		if err != nil {
			return Config{}, err
		}
	}

	return cfg, nil
}
