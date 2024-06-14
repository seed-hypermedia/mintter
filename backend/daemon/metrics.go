package daemon

import (
	"runtime"

	"crawshaw.io/sqlite"
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

	prometheus.MustRegister(newSQLiteCollector())
}

type sqliteCollector struct {
	prepares *prometheus.Desc
}

func newSQLiteCollector() *sqliteCollector {
	return &sqliteCollector{
		prepares: prometheus.NewDesc(
			"seed_sqlite_queries_total",
			"Total number of queries executed.",
			nil,
			nil,
		),
	}
}

func (s *sqliteCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- s.prepares
}

func (s *sqliteCollector) Collect(ch chan<- prometheus.Metric) {
	ch <- prometheus.MustNewConstMetric(s.prepares, prometheus.CounterValue, float64(sqlite.PrepareCount()))
}
