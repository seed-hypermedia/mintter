package main

import (
	"context"
	"errors"
	"flag"
	"os"
	"time"

	_ "expvar"
	_ "net/http/pprof"

	"mintter/backend/config"
	"mintter/backend/daemon"
	"mintter/backend/logging"

	"github.com/burdiyan/go/mainutil"
	"github.com/getsentry/sentry-go"
	"github.com/peterbourgon/ff/v3"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

func main() {
	const envVarPrefix = "MINTTER"

	mainutil.Run(func() error {
		ctx := mainutil.TrapSignals()

		fs := flag.NewFlagSet("mintterd", flag.ExitOnError)

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

		log := logging.New("mintterd", "debug")
		if err := sentry.Init(sentry.ClientOptions{}); err != nil {
			log.Debug("SentryInitError", zap.Error(err))
		} else {
			defer sentry.Flush(2 * time.Second)
		}

		app, err := daemon.Load(ctx, cfg,
			grpc.ChainUnaryInterceptor(
				otelgrpc.UnaryServerInterceptor(),
				daemon.GRPCDebugLoggingInterceptor(),
			),
			grpc.ChainStreamInterceptor(
				otelgrpc.StreamServerInterceptor(),
			),
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
