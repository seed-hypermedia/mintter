package main

import (
	"flag"
	"mintter/backend/relay"

	"go.uber.org/zap"
)

func main() {
	log, _ := zap.NewProduction(zap.WithCaller(false))
	defer log.Sync()
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
	relay, err := relay.NewRelay(log, cfg, privK)
	if err != nil {
		panic(err)
	}
	if err := relay.Start(); err != nil {
		panic(err)
	}
	select {}
}
