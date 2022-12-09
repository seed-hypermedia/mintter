package main

import (
	"context"
	"errors"
	"flag"
	"os"

	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon"
	protodaemon "mintter/backend/genproto/daemon/v1alpha"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/burdiyan/go/mainutil"
	"github.com/peterbourgon/ff/v3"
)

func main() {
	const envVarPrefix = "MINTTER"

	mainutil.Run(func() error {
		ctx := mainutil.TrapSignals()

		fs := flag.NewFlagSet("gateway", flag.ExitOnError)

		cfg := config.Default()
		config.SetupFlags(fs, &cfg)

		// We parse flags twice here, once without the config file setting, and then with it.
		// This is because we want the config file to be in the repo path, which can be changed
		// with flags or env vars. We don't allow setting a config file explicitly, but the repo path
		// can change. We need to know the requested repo path in the first place, and then figure out the config file.

		if err := ff.Parse(fs, os.Args[1:], ff.WithEnvVarPrefix(envVarPrefix)); err != nil {
			return err
		}

		if err := cfg.ExpandRepoPath(); err != nil {
			return err
		}

		cfgFile, err := config.EnsureConfigFile(cfg.RepoPath)
		if err != nil {
			return err
		}

		if err := ff.Parse(fs, os.Args[1:],
			ff.WithEnvVarPrefix(envVarPrefix),
			ff.WithConfigFileParser(ff.PlainParser),
			ff.WithConfigFile(cfgFile),
			ff.WithAllowMissingConfigFile(false),
		); err != nil {
			return err
		}

		app, err := daemon.LoadGateway(ctx, cfg)
		if err != nil {
			return err
		}

		const mnemonicWords = 12
		mnemonic, err := core.NewMnemonic(mnemonicWords)
		if err != nil {
			return err
		}

		_, err = app.RPC.Daemon.Register(ctx, &protodaemon.RegisterRequest{
			Mnemonic:   mnemonic,
			Passphrase: "",
		})
		stat, ok := status.FromError(err)
		if !ok && stat.Code() != codes.AlreadyExists {
			return err
		}

		_, err = app.Me.Await(ctx)
		if err != nil {
			return err
		}

		err = app.Wait()
		if errors.Is(err, context.Canceled) {
			return nil
		}

		return err
	})
}
