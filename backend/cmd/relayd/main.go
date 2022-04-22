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
	//log, _ := zap.NewProduction(zap.WithCaller(false))
	var log = logging.Logger("relay")
	lvl, err := logging.LevelFromString("debug")
	if err != nil {
		panic(err)
	}
	logging.SetAllLoggers(lvl)
	idPath := flag.String("id", "identity", "identity key file path")
	cfgPath := flag.String("config", "", "json configuration file; empty uses the default configuration")
	flag.Parse()

	cfg, err := relay.LoadConfig(*cfgPath)
	if err != nil {
		panic(err)
	}
	privK, err := relay.LoadIdentity(*idPath)
	if err != nil {
		panic(err)
	}

	relay, err := relay.NewRelay(log.Desugar(), cfg, privK)
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
