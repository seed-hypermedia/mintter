package metrics

import (
	"net/url"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewPrometheusEncoderConfig is similar to zap.NewProductionEncoderConfig except that
// it does not include timestamp (ts key)
func NewPrometheusEncoderConfig() zapcore.EncoderConfig {
	return zapcore.EncoderConfig{
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}
}

func NewPrometheusConfig() zap.Config {
	sinkURL := url.URL{Scheme: "prometheus", Host: PROM_HOST, User: url.UserPassword(PROM_USER, PROM_PASS)}

	return zap.Config{
		Level:       zap.NewAtomicLevelAt(zap.DebugLevel),
		Development: true,
		Sampling: &zap.SamplingConfig{
			Initial:    100,
			Thereafter: 100,
		},
		Encoding:         "json",
		EncoderConfig:    NewPrometheusEncoderConfig(),
		OutputPaths:      []string{"stderr", sinkURL.String()},
		ErrorOutputPaths: []string{"stderr", sinkURL.String()}, // TODO: should we have a different sink for errors?
	}
}

func NewPrometheus(options ...zap.Option) (*zap.Logger, error) {
	return NewPrometheusConfig().Build(options...)
}
