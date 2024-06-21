package sites

import "seed/backend/config"

// DefaultConfig for sites.
func DefaultConfig() config.Config {
	cfg := config.Default()
	cfg.DataDir = "~/.mtt-site"
	cfg.Syncing.NoPull = true
	cfg.Syncing.NoDiscovery = true
	cfg.P2P.ForceReachabilityPublic = true
	cfg.P2P.NoRelay = true

	return cfg
}
