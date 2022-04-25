package main

import (
	"flag"
	"mintter/backend/relay"
	"os"
	"os/signal"
	"syscall"

	logging "github.com/ipfs/go-log/v2"
)

func main() {
	var log = logging.Logger("relay")
	lvl, err := logging.LevelFromString("debug")
	if err != nil {
		panic(err)
	}
	logging.SetAllLoggers(lvl)
	cfgPath := flag.String("config", "", "json configuration file; empty uses the default configuration")
	flag.Parse()

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
