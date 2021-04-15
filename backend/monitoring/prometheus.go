package monitoring

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/m3db/prometheus_remote_client_golang/promremote"
)

var prometheusClient promremote.Client

func init() {
	var err error

	cfg := promremote.NewConfig(
		promremote.WriteURLOption(GetPrometheusURL()),
		promremote.HTTPClientTimeoutOption(5*time.Second),
		promremote.UserAgent("mintter/x.x"),
	)
	prometheusClient, err = promremote.NewClient(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "unable to construct client: %v", err)
	}
}

func SendMetric(name string, value float64) {
	var tsList []promremote.TimeSeries

	hostname, _ := os.Hostname()
	timestamp := time.Now()

	tsList = append(tsList, promremote.TimeSeries{
		Labels: []promremote.Label{
			{
				Name:  "__name__",
				Value: name,
			},
			{
				Name:  "hostname",
				Value: hostname,
			},
		},
		Datapoint: promremote.Datapoint{
			Timestamp: timestamp,
			Value:     value,
		},
	})

	_, writeErr := prometheusClient.WriteTimeSeries(context.Background(), tsList, promremote.WriteOptions{})
	if err := error(writeErr); err != nil {
		json.NewEncoder(os.Stdout).Encode(struct {
			Success    bool   `json:"success"`
			Error      string `json:"error"`
			StatusCode int    `json:"statusCode"`
		}{
			Success:    false,
			Error:      err.Error(),
			StatusCode: writeErr.StatusCode(),
		})
		os.Stdout.Sync()

		fmt.Fprintf(os.Stderr, "write error: %s", err)
	}
}
