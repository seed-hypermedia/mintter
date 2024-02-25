//go:build darwin
// +build darwin

// Package darwinmetrics provides a Prometheus collector for Darwin-specific metrics,
// because the built-in Prometheus process collector only supports Linux and Windows.
package darwinmetrics

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/shirou/gopsutil/v3/process"
)

type processCollector struct {
	collectFn       func(chan<- prometheus.Metric)
	pidFn           func() (int, error)
	reportErrors    bool
	cpuTotal        *prometheus.Desc
	openFDs, maxFDs *prometheus.Desc
	vsize, maxVsize *prometheus.Desc
	rss             *prometheus.Desc
	startTime       *prometheus.Desc
	diskReads       *prometheus.Desc
	diskWrites      *prometheus.Desc
	proc            *process.Process
}

// Opts defines the behavior of a process metrics collector
// created with NewCollector.
type Opts struct {
	// PidFn returns the PID of the process the collector collects metrics
	// for. It is called upon each collection. By default, the PID of the
	// current process is used, as determined on construction time by
	// calling os.Getpid().
	PidFn func() (int, error)
	// If non-empty, each of the collected metrics is prefixed by the
	// provided string and an underscore ("_").
	Namespace string
	// If true, any error encountered during collection is reported as an
	// invalid metric (see NewInvalidMetric). Otherwise, errors are ignored
	// and the collected metrics will be incomplete. (Possibly, no metrics
	// will be collected at all.) While that's usually not desired, it is
	// appropriate for the common "mix-in" of process metrics, where process
	// metrics are nice to have, but failing to collect them should not
	// disrupt the collection of the remaining metrics.
	ReportErrors bool
}

// NewCollector returns a collector which exports the current state of
// process metrics including CPU, memory and file descriptor usage as well as
// the process start time. The detailed behavior is defined by the provided
// ProcessCollectorOpts. The zero value of ProcessCollectorOpts creates a
// collector for the current process with an empty namespace string and no error
// reporting.
func NewCollector(opts Opts) prometheus.Collector {
	ns := ""
	if len(opts.Namespace) > 0 {
		ns = opts.Namespace + "_"
	}

	c := &processCollector{
		reportErrors: opts.ReportErrors,
		// Metrics from the Prometheus' built-in process collector (which doesn't support macOS).
		cpuTotal: prometheus.NewDesc(
			ns+"process_cpu_seconds_total",
			"Total user and system CPU time spent in seconds.",
			nil, nil,
		),
		openFDs: prometheus.NewDesc(
			ns+"process_open_fds",
			"Number of open file descriptors.",
			nil, nil,
		),
		maxFDs: prometheus.NewDesc(
			ns+"process_max_fds",
			"Maximum number of open file descriptors.",
			nil, nil,
		),
		vsize: prometheus.NewDesc(
			ns+"process_virtual_memory_bytes",
			"Virtual memory size in bytes.",
			nil, nil,
		),
		maxVsize: prometheus.NewDesc(
			ns+"process_virtual_memory_max_bytes",
			"Maximum amount of virtual memory available in bytes.",
			nil, nil,
		),
		rss: prometheus.NewDesc(
			ns+"process_resident_memory_bytes",
			"Resident memory size in bytes.",
			nil, nil,
		),
		startTime: prometheus.NewDesc(
			ns+"process_start_time_seconds",
			"Start time of the process since unix epoch in seconds.",
			nil, nil,
		),

		// Custom disk i/o metrics.
		diskReads: prometheus.NewDesc(
			ns+"process_disk_read_bytes_total",
			"Total number of bytes read from disk by the process.",
			nil, nil,
		),
		diskWrites: prometheus.NewDesc(
			ns+"process_disk_written_bytes_total",
			"Total number of bytes written to disk by the process.",
			nil, nil,
		),
	}

	if opts.PidFn == nil {
		c.pidFn = func() (int, error) {
			return os.Getpid(), nil
		}
	} else {
		c.pidFn = opts.PidFn
	}

	if err := func() error {
		pid, err := c.pidFn()
		if err != nil {
			return err
		}

		proc, err := process.NewProcess(int32(pid))
		if err != nil {
			return err
		}

		c.proc = proc

		return nil
	}(); err != nil {
		c.collectFn = func(ch chan<- prometheus.Metric) {
			c.reportError(ch, nil, errors.New("process metrics not supported on this platform"))
		}
	} else {
		c.collectFn = c.processCollect
	}

	return c
}

// Describe returns all descriptions of the collector.
func (c *processCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- c.cpuTotal
	ch <- c.openFDs
	ch <- c.maxFDs
	ch <- c.vsize
	ch <- c.maxVsize
	ch <- c.rss
	ch <- c.startTime
	ch <- c.diskReads
	ch <- c.diskWrites
}

// Collect returns the current state of all metrics of the collector.
func (c *processCollector) Collect(ch chan<- prometheus.Metric) {
	c.collectFn(ch)
}

func (c *processCollector) reportError(ch chan<- prometheus.Metric, desc *prometheus.Desc, err error) {
	if !c.reportErrors {
		return
	}
	if desc == nil {
		desc = prometheus.NewInvalidDesc(err)
	}
	ch <- prometheus.NewInvalidMetric(desc, err)
}

// NewPidFileFn returns a function that retrieves a pid from the specified file.
// It is meant to be used for the PidFn field in ProcessCollectorOpts.
func NewPidFileFn(pidFilePath string) func() (int, error) {
	return func() (int, error) {
		content, err := os.ReadFile(pidFilePath)
		if err != nil {
			return 0, fmt.Errorf("can't read pid file %q: %w", pidFilePath, err)
		}
		pid, err := strconv.Atoi(strings.TrimSpace(string(content)))
		if err != nil {
			return 0, fmt.Errorf("can't parse pid file %q: %w", pidFilePath, err)
		}

		return pid, nil
	}
}

func (c *processCollector) processCollect(ch chan<- prometheus.Metric) {
	times, err := c.proc.Times()
	if err != nil {
		c.reportError(ch, c.cpuTotal, err)
	} else {
		ch <- prometheus.MustNewConstMetric(c.cpuTotal, prometheus.CounterValue, times.System+times.User)
	}

	ctime, err := c.proc.CreateTime()
	if err != nil {
		c.reportError(ch, c.startTime, err)
	} else {
		ch <- prometheus.MustNewConstMetric(c.startTime, prometheus.GaugeValue, float64(ctime)/1000)
	}

	mem, err := c.proc.MemoryInfo()
	if err != nil {
		c.reportError(ch, c.rss, err)
	} else {
		ch <- prometheus.MustNewConstMetric(c.rss, prometheus.GaugeValue, float64(mem.RSS))
		ch <- prometheus.MustNewConstMetric(c.vsize, prometheus.GaugeValue, float64(mem.VMS))
	}

	c.collectDiskIO(ch)
}
