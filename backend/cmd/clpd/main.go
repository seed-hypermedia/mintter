package main

import (
	"log"
	"mintter/backend/clightning/getkeys"
	"os"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/niftynei/glightning/glightning"
)

const (
	VERSION = "0.0.2"
)

var plugin *glightning.Plugin
var lightning *glightning.Lightning
var lightningdir string
var bitcoinNet *chaincfg.Params

func main() {
	plugin = glightning.NewPlugin(onInit)
	lightning = glightning.NewLightning()

	registerOptions(plugin)
	registerMethods(plugin)

	err := plugin.Start(os.Stdin, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}

func onInit(plugin *glightning.Plugin, options map[string]glightning.Option, config *glightning.Config) {
	log.Printf("version: %s initialized", VERSION)

	lightningdir = config.LightningDir

	lightning.StartUp(config.RpcFile, config.LightningDir)

	cfg, err := lightning.ListConfigs()
	if err != nil {
		log.Fatal(err)
	}

	switch cfg["network"] {
	case "bitcoin":
		bitcoinNet = &chaincfg.MainNetParams
	case "regtest":
		bitcoinNet = &chaincfg.RegressionNetParams
	case "signet":
		panic("unsupported network")
	default:
		bitcoinNet = &chaincfg.TestNet3Params
	}
}

func registerOptions(p *glightning.Plugin) {

}

func registerMethods(p *glightning.Plugin) {
	getkeys := glightning.NewRpcMethod(&getkeys.GetKeys{}, `get key information from a given derivation path under unencrypted hsm_secret.`)
	getkeys.LongDesc = "If hsm_secret is encrypted, the {hsmpasswordfile} param must be provided. In case hsm_secret is not in the default path you can specify it with {Hhsmsecretpath} param. If {newaddr} is true, then the derivation path chosen is m/0/0/new_idx where new_idx is the last index in the internal wallet. If the lightningd database is not in the default location you can set it with {dbpath} (only applies to newaddress since bip32_max_index should be known and dev-listaddrs is not available in golang)"
	getkeys.Category = "utility"
	p.RegisterMethod(getkeys)
}
