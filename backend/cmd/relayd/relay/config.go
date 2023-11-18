package relay

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
)

const defaultCfgPath = "./relay.conf"

// Config holds relay configuration.
type Config struct {
	PrivKey string
	Port    int
	ConnMgr connMgrConfig
	RelayV2 relayV2Config
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

func defaultConfig() Config {
	return Config{
		Port: 4001,
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

// LoadConfig from file.
func LoadConfig(filePath string) (cfg Config, err error) {
	cfg = defaultConfig()
	if filePath == "" {
		filePath = defaultCfgPath
	}

RETRY:
	f, err := os.Open(filePath)
	if os.IsNotExist(err) {
		if err := os.WriteFile(filePath, []byte("{}"), 0600); err != nil {
			return cfg, fmt.Errorf("failed to create config file %q: %w", filePath, err)
		}
		goto RETRY
	}
	if err != nil {
		return cfg, fmt.Errorf("failed to open config file %q: %w", filePath, err)
	}
	defer f.Close()

	decoder := json.NewDecoder(f)
	if err := decoder.Decode(&cfg); err != nil {
		return cfg, fmt.Errorf("failed to decode config file %q: %w", filePath, err)
	}

	if cfg.PrivKey == "" {
		keyStr, err := newPrivKeyString(nil)
		if err != nil {
			return cfg, fmt.Errorf("failed to create new random identity: %w", err)
		}
		cfg.PrivKey = keyStr
		bytes, err := json.MarshalIndent(cfg, "", "  ")
		if err != nil {
			return Config{}, err
		}

		if err = os.WriteFile(filePath, bytes, 0600); err != nil {
			return Config{}, err
		}
	}

	return cfg, nil
}
