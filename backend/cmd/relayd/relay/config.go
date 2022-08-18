package relay

import (
	"encoding/json"
	"os"
	"time"

	relayv1 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay"
	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
)

// Config holds relay configuration.
type Config struct {
	PrivKey string
	Network networkConfig
	ConnMgr connMgrConfig
	RelayV1 relayV1Config
	RelayV2 relayV2Config
	ACL     aclConfig
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
		PrivKey: "08011240a32b1c17b1e07e6ea398abe22aaf59ca4963904e851b847e8f5d900e8e2df8e932e08f2ff4a0477b66630e7fc3d1f543a5a5269395aa14e525213216f9e13e8a",
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
	}
}

// LoadConfig reads configuration from json file in cfgPath.
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
