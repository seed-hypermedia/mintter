//go:build darwin
// +build darwin

package daemon

import (
	"seed/backend/pkg/darwinmetrics"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

func init() {
	// Unregister default process collector and register our own that supports macOS.
	prometheus.Unregister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))
	prometheus.MustRegister(darwinmetrics.NewCollector(darwinmetrics.Opts{}))
}
