package sites

import "mintter/backend/config"

// DefaultConfig for sites.
func DefaultConfig() config.Config {
	cfg := config.Default()
	cfg.DataDir = "~/.mintter-site"
	cfg.Syncing.Disabled = true
	cfg.P2P.ForceReachabilityPublic = true
	cfg.P2P.NoRelay = true

	return cfg
}
