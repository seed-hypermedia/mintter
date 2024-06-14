// Package main implements main script to run relay daemon.
package main

import (
	"flag"
	"seed/backend/cmd/relayd/relay"

	"github.com/burdiyan/go/mainutil"
	logging "github.com/ipfs/go-log/v2"
)

func main() {
	mainutil.Run(run)
}

func run() error {
	ctx := mainutil.TrapSignals()

	var (
		log      = logging.Logger("seed/relay")
		cfgPath  = flag.String("config", "", "json configuration file; empty uses the default configuration")
		loglevel = flag.String("loglevel", "info", "defines the log level {DEBUG | INFO(default) | WARN | ERROR | DPANIC | PANIC | FATAL}")
	)

	flag.Parse()

	lvl, err := logging.LevelFromString(*loglevel)
	if err != nil {
		return err
	}

	logging.SetAllLoggers(lvl)

	cfg, err := relay.LoadConfig(*cfgPath)
	if err != nil {
		return err
	}

	relay, err := relay.NewRelay(log.Desugar(), cfg)
	if err != nil {
		return err
	}

	if err := relay.Start(); err != nil {
		return err
	}

	<-ctx.Done()
	log.Info("Signal captured, shutting down gracefully...")

	return relay.Stop()
}
