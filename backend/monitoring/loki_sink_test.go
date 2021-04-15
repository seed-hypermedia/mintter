package monitoring_test

import (
	"mintter/backend/monitoring"
	"testing"

	"go.uber.org/zap"
)

func TestNewLokiLogger(t *testing.T) {
	log, err := monitoring.NewLokiLogger()
	if err != nil {
		panic(err)
	}
	defer log.Sync()
	log.Info("Logging line from TestNewLokiLogger", zap.String("k", "v"))
}

func TestLokiSink(t *testing.T) {
	sinkURL := monitoring.GetLokiURLString()
	ws, _, err := zap.Open(sinkURL)
	if err != nil {
		panic(err)
	}
	someBytes := []byte("Logging line from TestLokiSink")
	ws.Write(someBytes)
}
