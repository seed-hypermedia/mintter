package daemon

import (
	"fmt"
	"mintter/backend/config"
	"mintter/backend/logging"
	"mintter/backend/monitoring"
	"os"

	ipfslog "github.com/ipfs/go-log/v2"
	"github.com/mattn/go-isatty"
)

func developmentConfigIPFS() ipfslog.Config {
	cfg := ipfslog.Config{
		Format: ipfslog.ColorizedOutput,
		Stdout: true,
		Stderr: true,
		Level:  ipfslog.LevelInfo,
	}
	return cfg
}

func productionConfigIPFS() ipfslog.Config {
	cfg := ipfslog.Config{
		Format: ipfslog.JSONOutput,
		Stdout: true,
		Stderr: true,
		Level:  ipfslog.LevelInfo,
	}
	return cfg
}

func developmentConfig() logging.Config {
	cfg := logging.Config{
		Format: logging.ColorizedOutput,
		Stdout: true,
		Level:  logging.LevelDebug,
		Labels: map[string]string{},
	}
	return cfg
}

func productionConfig() logging.Config {
	cfg := logging.Config{
		Format: logging.JSONOutput,
		Stdout: true,
		Level:  logging.LevelInfo,
		Labels: map[string]string{},
	}
	return cfg
}

// setupLogging sets up the logging system
func setupLogging(cfg config.Config) {
	var loggingConfig logging.Config
	var ipfsConfig ipfslog.Config

	if isatty.IsTerminal(os.Stdout.Fd()) {
		loggingConfig = developmentConfig()
		ipfsConfig = developmentConfigIPFS()
	} else {
		loggingConfig = productionConfig()
		ipfsConfig = productionConfigIPFS()
	}

	if !cfg.NoTelemetry {
		loggingConfig.URL = monitoring.GetLokiURLString()
		ipfsConfig.URL = monitoring.GetLokiURLString()
	}

	logging.SetupLogging(loggingConfig)
	logging.SetupIPFSLogging(ipfsConfig)

	// Logging level is specified
	if cfg.LogLevel != "" {
		lvl, err := logging.LevelFromString(cfg.LogLevel)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error setting log level: %s\n", err)
		}
		logging.SetAllLoggers(lvl)
	}

	lvl, err := ipfslog.LevelFromString(cfg.IPFSLogLevel)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error setting IPFS log level: %s\n", err)
	}
	ipfslog.SetAllLoggers(lvl)
}
