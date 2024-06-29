package main

import (
	"context"
	"errors"
	"flag"
	"os"
	"time"

	_ "expvar"
	_ "net/http/pprof"

	"seed/backend/config"
	"seed/backend/core"
	"seed/backend/daemon"
	storage "seed/backend/daemon/storage2"
	"seed/backend/logging"

	"github.com/burdiyan/go/mainutil"
	"github.com/getsentry/sentry-go"
	"github.com/peterbourgon/ff/v3"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

func main() {
	const envVarPrefix = "SEED"

	mainutil.Run(func() error {
		ctx := mainutil.TrapSignals()

		fs := flag.NewFlagSet("seed-daemon", flag.ExitOnError)

		cfg := config.Default()
		cfg.BindFlags(fs)

		// We parse flags twice here, once without the config file setting, and then with it.
		// This is because we want the config file to be in the repo path, which can be changed
		// with flags or env vars. We don't allow setting a config file explicitly, but the repo path
		// can change. We need to know the requested repo path in the first place, and then figure out the config file.

		if err := ff.Parse(fs, os.Args[1:], ff.WithEnvVarPrefix(envVarPrefix)); err != nil {
			return err
		}

		if err := cfg.Base.ExpandDataDir(); err != nil {
			return err
		}

		cfgFile, err := config.EnsureConfigFile(cfg.Base.DataDir)
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

		log := logging.New("seed-daemon", cfg.LogLevel)
		if err := sentry.Init(sentry.ClientOptions{}); err != nil {
			log.Debug("SentryInitError", zap.Error(err))
		} else {
			defer sentry.Flush(2 * time.Second)
		}

		keyStoreEnvironment := cfg.P2P.TestnetName
		if keyStoreEnvironment == "" {
			keyStoreEnvironment = "main"
		}
		ks := core.NewOSKeyStore(keyStoreEnvironment)

		dir, err := storage.Open(cfg.Base.DataDir, nil, ks, cfg.LogLevel)
		if err != nil {
			return err
		}
		defer dir.Close()

		app, err := daemon.Load(ctx, cfg, dir,
			daemon.WithGRPCServerOption(grpc.ChainUnaryInterceptor(
				otelgrpc.UnaryServerInterceptor(),
				daemon.GRPCDebugLoggingInterceptor(),
			)),
			daemon.WithGRPCServerOption(grpc.ChainStreamInterceptor(
				otelgrpc.StreamServerInterceptor(),
			)),
		)
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
