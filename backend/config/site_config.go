// Package config provides global configuration.
package config

import (
	"flag"
	"fmt"
	"mintter/backend/core"
	"os"
	"path/filepath"
)

// Site configuration.
type Site struct {
	// Protocol + hostname where this site is hosted
	Origin string
	// Owner account EID of the site's owner
	owner core.Principal
}

// SetupSiteFlags configures the given FlagSet with the existing values from the given Config
// and prepares the FlagSet to parse the flags into the Config.
func SetupSiteFlags(fs *flag.FlagSet, cfg *Config) {
	fs.IntVar(&cfg.HTTPPort, "http-port", cfg.HTTPPort, "Port to expose HTTP Server (including grpc-web)")
	fs.IntVar(&cfg.GRPCPort, "grpc-port", cfg.GRPCPort, "Port to expose gRPC server")
	fs.StringVar(&cfg.RepoPath, "repo-path", cfg.RepoPath, "Path where site data is stored")
	fs.StringVar(&cfg.LogLevel, "log-level", cfg.LogLevel, "Log verbosity debug | info | warning | error")

	fs.BoolVar(&cfg.Lndhub.Mainnet, "lndhub.mainnet", cfg.Lndhub.Mainnet, "Connect to the mainnet lndhub.go server")

	fs.IntVar(&cfg.P2P.Port, "p2p.port", cfg.P2P.Port, "Port to listen for incoming P2P connections")
}

// EnsureSiteConfigFile makes sure a config file exist.
func EnsureSiteConfigFile(repoPath string) (filename string, err error) {
	if !filepath.IsAbs(repoPath) {
		return "", fmt.Errorf("repo path must be an absolute path")
	}

	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return "", err
	}

	filename = filepath.Join(repoPath, "mintterd.conf")

	_, err = os.Lstat(filename)
	if err == nil {
		return filename, nil
	}

	if os.IsNotExist(err) {
		if err := os.WriteFile(filename, []byte(`# Config file for the mintter-site program.
# You can set any CLI flags here, one per line with a space between key and value.
`), 0600); err != nil {
			return "", err
		}

		return filename, nil
	}

	return "", err
}
