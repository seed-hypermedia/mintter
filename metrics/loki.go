package metrics

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type LokiEntry struct {
	TS   string `json:"ts"`
	Line string `json:"line"`
}

func NewLokiLabels(labels map[string]string) string {

	if labels == nil {
		return "null"
	}

	var buf strings.Builder

	buf.WriteString("{")
	for key, value := range labels {
		fmt.Fprintf(&buf, "%s=\"%s\",", key, value)
	}
	buf.WriteString("{")

	final := buf.String()
	final = final[:len(final)-1] + "}"
	return final
}

type LokiStream struct {
	Labels  string      `json:"labels"`
	Entries []LokiEntry `json:"entries"`
}

type LokiData struct {
	Streams []LokiStream `json:"streams"`
}

func NewLokiStream(labels map[string]string) LokiStream {
	stream := LokiStream{}
	stream.Labels = NewLokiLabels(labels)
	return stream
}

func (l *LokiData) AddStream(stream LokiStream) {
	l.Streams = append(l.Streams, stream)
}

func (s *LokiStream) AddEntry(line string) {
	entry := LokiEntry{
		TS:   time.Now().Format(time.RFC3339Nano),
		Line: string(line),
	}
	s.Entries = append(s.Entries, entry)
}

func NewLokiDataStream(labels map[string]string, line []byte) ([]byte, error) {
	hostname, _ := os.Hostname()
	env := "dev"

	stream := NewLokiStream(map[string]string{"app": "mintter", "hostname": hostname, "env": env})
	stream.AddEntry(string(line))
	jsonStr2 := LokiData{}
	jsonStr2.AddStream(stream)
	b, err := json.Marshal(jsonStr2)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// NewLokiEncoderConfig is similar to zap.NewProductionEncoderConfig except that
// it does not include timestamp (ts key)
func NewLokiEncoderConfig() zapcore.EncoderConfig {
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

func NewLokiConfig() zap.Config {
	sinkURL := url.URL{Scheme: "loki", Host: LokiHost, User: url.UserPassword(LokiUser, LokiPass)}

	return zap.Config{
		Level:       zap.NewAtomicLevelAt(zap.WarnLevel),
		Development: true,
		Sampling: &zap.SamplingConfig{
			Initial:    100,
			Thereafter: 100,
		},
		Encoding:         "json",
		EncoderConfig:    NewLokiEncoderConfig(),
		OutputPaths:      []string{"stderr", sinkURL.String()},
		ErrorOutputPaths: []string{"stderr", sinkURL.String()}, // TODO: should we have a different sink for errors?
	}
}

func NewLokiLogger(options ...zap.Option) (*zap.Logger, error) {
	return NewLokiConfig().Build(options...)
}
