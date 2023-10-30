package relay

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"time"

	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
	"go.uber.org/zap"
)

const defaultCfgPath = "./relay.conf"

// Config holds relay configuration.
type Config struct {
	PrivKey string
	Network networkConfig
	ConnMgr connMgrConfig
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

type relayV2Config struct {
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
				"/ip4/0.0.0.0/udp/4001/quic-v1",
				"/ip6/::/udp/4001/quic-v1",
				"/ip4/0.0.0.0/tcp/4001",
				"/ip6/::/tcp/4001",
			},
		},
		ConnMgr: connMgrConfig{
			ConnMgrLo:    512,
			ConnMgrHi:    768,
			ConnMgrGrace: 2 * time.Minute,
		},
		RelayV2: relayV2Config{
			Resources: relayv2.DefaultResources(),
		},
	}
}

// LoadConfig reads configuration from json file in cfgPath.
func (r *Relay) loadConfig(cfgPath string) (Config, error) {
	cfg := defaultConfig()
	if cfgPath != "" {
		cfgFile, err := os.Open(cfgPath)
		if err != nil {
			r.log.Error("Can't open provided conf file", zap.String("Path ", cfgPath))
			return Config{}, err
		}
		defer cfgFile.Close()

		decoder := json.NewDecoder(cfgFile)
		err = decoder.Decode(&cfg)
		if err != nil {
			r.log.Error("Can't decode provided conf file", zap.String("Path ", cfgPath))
			return Config{}, err
		}
	} else if cfgFile, err := os.Open(defaultCfgPath); err == nil {
		r.log.Info("Found a default config file. Reading it", zap.String("Path ", defaultCfgPath))
		defer cfgFile.Close()
		decoder := json.NewDecoder(cfgFile)
		err = decoder.Decode(&cfg)
		if err != nil {
			r.log.Error("Can't decode default conf file", zap.String("Path ", cfgPath))
			return Config{}, err
		}
	}

	if cfg.PrivKey == "" {
		key_str, err := NewIdentity()
		if err != nil {
			return Config{}, err
		}
		cfg.PrivKey = key_str
		bytes, err := json.MarshalIndent(cfg, "", " ")
		if err != nil {
			return Config{}, err
		}
		if cfgPath == "" {
			cfgPath = defaultCfgPath
		}
		r.log.Info("New Identity was added to the conf file", zap.String("Path ", cfgPath))
		if err = ioutil.WriteFile(cfgPath, bytes, 0644); err != nil {
			return Config{}, err
		}
	}

	return cfg, nil
}
