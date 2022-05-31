package main

import (
	"context"
	"log"
	"os"
	"time"

	_ "expvar"
	_ "net/http/pprof"

	"mintter/backend/clightning/getkeys"
	"mintter/backend/config"
	"mintter/backend/daemon"

	"github.com/alecthomas/kong"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
	"github.com/niftynei/glightning/glightning"
	"go.uber.org/fx"
)

// Version could be replaced by passing linker flags.
var Version = "<dev>"
var plugin *glightning.Plugin
var lightning *glightning.Lightning
var lightningdir string
var bitcoinNet *chaincfg.Params

const (
	PLUGIN_VERSION = "0.0.2"
)

func main() {
	var cfg config.Config

	kong.Parse(&cfg,
		kong.Name("mintterd"),
		kong.Resolvers(kongcli.EnvResolver("")),
		kong.Description("Version: "+Version),
	)

	mainutil.Run(func() error {
		app := fx.New(
			daemon.Module(cfg),
			fx.StopTimeout(1*time.Minute),
		)

		ctx := mainutil.TrapSignals()

		if err := app.Start(ctx); err != nil {
			return err
		}

		plugin = glightning.NewPlugin(onInit)
		lightning = glightning.NewLightning()

		registerOptions(plugin)
		registerMethods(plugin)

		in, err := os.Create("/tmp/in")
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create("/tmp/out")
		if err != nil {
			return err
		}
		defer out.Close()
		err = plugin.Start(in, out)
		if err != nil {
			return err
		}

		<-ctx.Done()

		return app.Stop(context.Background())
	})
}

func onInit(plugin *glightning.Plugin, options map[string]glightning.Option, config *glightning.Config) {
	log.Printf("version: %s initialized", PLUGIN_VERSION)

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
	getkeys := glightning.NewRpcMethod(&getkeys.GetKeys{}, `Mintter get key information from a given derivation path under unencrypted hsm_secret.`)
	getkeys.LongDesc = "If hsm_secret is encrypted, the {hsmpasswordfile} param must be provided. In case hsm_secret is not in the default path you can specify it with {Hhsmsecretpath} param. If {newaddr} is true, then the derivation path chosen is m/0/0/new_idx where new_idx is the last index in the internal wallet. If the lightningd database is not in the default location you can set it with {dbpath} (only applies to newaddress since bip32_max_index should be known and dev-listaddrs is not available in golang)"
	getkeys.Category = "utility"
	p.RegisterMethod(getkeys)
}
