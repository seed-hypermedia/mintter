package main

import (
	"flag"
	"mintter/backend/cmd/relayd/relay"
	"os"
	"os/signal"
	"syscall"

	logging "github.com/ipfs/go-log/v2"
)

func main() {
	var log = logging.Logger("relay")

	cfgPath := flag.String("config", "", "json configuration file; empty uses the default configuration")
	loglevel := flag.String("loglevel", "info", "defines the log level {DEBUG | INFO(default) | WARN | ERROR | DPANIC | PANIC | FATAL}")
	flag.Parse()

	lvl, err := logging.LevelFromString(*loglevel)
	if err != nil {
		panic(err)
	}

	logging.SetAllLoggers(lvl)
	cfg, err := relay.LoadConfig(*cfgPath)
	if err != nil {
		panic(err)
	}

	relay, err := relay.NewRelay(log.Desugar(), cfg)
	if err != nil {
		panic(err)
	}
	if err := relay.Start(); err != nil {
		panic(err)
	}

	sigs := make(chan os.Signal, 1)

	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	done := make(chan bool, 1)

	go func() {
		<-sigs
		log.Desugar().Info("Signal captured, shutting down gracefully...")
		done <- true
	}()
	<-done
	log.Desugar().Info("Exited normally")
}
