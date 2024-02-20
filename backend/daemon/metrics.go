package daemon

import (
	"runtime"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var mNumCPU = promauto.NewGauge(prometheus.GaugeOpts{
	Name: "process_num_cpus",
	Help: "Number of CPU cores available in the system.",
})

func init() {
	mNumCPU.Set(float64(runtime.NumCPU()))

	prometheus.MustRegister(collectors.NewBuildInfoCollector())

	// Unregister default Go runtime collector, and register it again with more metrics.
	prometheus.Unregister(collectors.NewGoCollector())
	prometheus.MustRegister(collectors.NewGoCollector(collectors.WithGoCollectorRuntimeMetrics(collectors.MetricsAll)))
}
