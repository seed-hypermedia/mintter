package monitoring

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLokiEncoderConfig is similar to zap.NewProductionEncoderConfig except that
// it does not include timestamp nor caller
func NewLokiEncoderConfig() zapcore.EncoderConfig {
	return zapcore.EncoderConfig{
		LevelKey:       "level",
		NameKey:        "logger",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}
}

func NewLokiConfig() zap.Config {
	sinkURL := GetLokiURL()

	return zap.Config{
		Level:       zap.NewAtomicLevelAt(zap.DebugLevel),
		Development: true,
		Sampling: &zap.SamplingConfig{
			Initial:    100,
			Thereafter: 100,
		},
		Encoding:         "json",
		EncoderConfig:    NewLokiEncoderConfig(),
		OutputPaths:      []string{"stderr", sinkURL.String()},
		ErrorOutputPaths: []string{"stderr", sinkURL.String()},
	}
}

func NewLokiLogger(options ...zap.Option) (*zap.Logger, error) {
	return NewLokiConfig().Build(options...)
}
