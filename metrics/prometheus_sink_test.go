package metrics_test

import (
	"mintter/metrics"
	"net/url"
	"testing"

	"go.uber.org/zap"
)

func TestNewPrometheus(t *testing.T) {
	log, err := metrics.NewPrometheus()
	if err != nil {
		panic(err)
	}
	defer log.Sync()
	log.Info("Logging line from TestNewPrometheus", zap.String("k", "v"))
}

func TestPrometheusSink(t *testing.T) {
	sinkURL := url.URL{Scheme: "prometheus", Host: metrics.PROM_HOST, User: url.UserPassword(metrics.PROM_USER, metrics.PROM_PASS)}
	ws, _, err := zap.Open(sinkURL.String())
	if err != nil {
		panic(err)
	}
	someBytes := []byte("Logging line from TestPrometheusSink")
	ws.Write(someBytes)
}
