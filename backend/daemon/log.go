package daemon

import (
	"fmt"
	"mintter/backend/config"
	"mintter/backend/logging"
	"mintter/backend/monitoring"
	"os"

	ipfslog "github.com/ipfs/go-log"
	"github.com/mattn/go-isatty"
)

func developerConfig() logging.Config {
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

	if isatty.IsTerminal(os.Stdout.Fd()) {
		loggingConfig = developerConfig()
	} else {
		loggingConfig = productionConfig()
	}

	if !cfg.NoTelemetry {
		loggingConfig.URL = monitoring.GetLokiURLString()
	}

	logging.SetupLogging(loggingConfig)

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
