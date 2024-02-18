// Package procmetrics provides a Prometheus collector for exposing process metrics
// of the currently running Go process. This is similar to the built-in Prometheus' ProcessCollector but also
// has some similarities with the Node Exporter but tied to the current process.
// Also, it supports macOS which those other tools don't.
package procmetrics

import (
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/shirou/gopsutil/v3/process"
)

// Collector is an implementation of Prometheus Collector
// that exposes process metrics of the currently running Go process.
type Collector struct {
	cpu        *prometheus.Desc
	createTime *prometheus.Desc

	proc  *process.Process
	ctime time.Time
}

// NewCollector returns a new Collector which exports process metrics.
// The namespace argument is used to prefix the metric names with the provided string + an underscore.
func NewCollector(namespace string) *Collector {
	if namespace != "" {
		namespace += "_"
	}

	pid := os.Getpid()

	procs, err := process.Processes()
	if err != nil {
		panic(err)
	}

	var proc *process.Process
	for _, p := range procs {
		if int(p.Pid) == pid {
			proc = p
			break
		}
	}
	if proc == nil {
		panic("BUG: can't find our own process to monitor")
	}

	createTime, err := proc.CreateTime()
	if err != nil {
		panic(err)
	}

	return &Collector{
		cpu: prometheus.NewDesc(
			namespace+"proc_cpu_seconds_total",
			"Total CPU time spent in seconds.",
			[]string{"mode"}, nil,
		),
		createTime: prometheus.NewDesc(
			namespace+"proc_start_time_seconds",
			"Start time of the process since unix epoch in seconds.",
			nil, nil,
		),
		proc:  proc,
		ctime: time.UnixMilli(createTime),
	}
}

// Describe implements prometheus.Collector.
func (c *Collector) Describe(ch chan<- *prometheus.Desc) {
	ch <- c.cpu
	ch <- c.createTime
}

// Collect implements prometheus.Collector.
func (c *Collector) Collect(ch chan<- prometheus.Metric) {
	times, err := c.proc.Times()
	if err == nil {
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.User, "user")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.System, "system")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Idle, "idle")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Nice, "nice")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Iowait, "iowait")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Irq, "irq")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Softirq, "softirq")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Steal, "steal")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.Guest, "guest")
		ch <- prometheus.MustNewConstMetric(c.cpu, prometheus.CounterValue, times.GuestNice, "guestNice")
	}

	ch <- prometheus.MustNewConstMetric(c.createTime, prometheus.GaugeValue, float64(c.ctime.Unix()))
}
