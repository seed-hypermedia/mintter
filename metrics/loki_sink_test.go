package metrics_test

import (
	"mintter/metrics"
	"net/url"
	"testing"

	"go.uber.org/zap"
)

func TestNewLokiLogger(t *testing.T) {
	log, err := metrics.NewLokiLogger()
	if err != nil {
		panic(err)
	}
	defer log.Sync()
	log.Info("Logging line from TestNewLokiLogger", zap.String("k", "v"))
}

func TestLokiSink(t *testing.T) {
	sinkURL := url.URL{Scheme: "loki", Host: metrics.LokiHost, User: url.UserPassword(metrics.LokiUser, metrics.LokiPass)}
	ws, _, err := zap.Open(sinkURL.String())
	if err != nil {
		panic(err)
	}
	someBytes := []byte("Logging line from TestLokiSink")
	ws.Write(someBytes)
}
