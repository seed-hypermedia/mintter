//go:build darwin
// +build darwin

package procmetrics

import (
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/shirou/gopsutil/v3/process"
)

var procCache sync.Map

func canCollectProcess() bool {
	pid, err := getPIDFn()()
	if err != nil {
		return false
	}

	if _, err := process.NewProcess(int32(pid)); err != nil {
		return false
	}

	return true
}

func (c *processCollector) processCollect(ch chan<- prometheus.Metric) {
	if proc, err := c.loadProc(); err != nil {
		c.reportError(ch, nil, err)
	} else {
		times, err := proc.Times()
		if err != nil {
			c.reportError(ch, nil, err)
		} else {
			ch <- prometheus.MustNewConstMetric(c.cpuTotal, prometheus.CounterValue, times.System+times.User)

			ctimeMilli, err := proc.CreateTime()
			if err != nil {
				c.reportError(ch, nil, err)
			} else {
				ch <- prometheus.MustNewConstMetric(c.startTime, prometheus.GaugeValue, float64(ctimeMilli)/1000)
			}
		}
	}

	return
}

func (c *processCollector) loadProc() (*process.Process, error) {
	// We use the pointer to the collector as the key to the cache to avoid any problems
	// in case many instances of the collector are created and they decide to track anything else.
	// It's probably unnecessary at all though.

	v, ok := procCache.Load(c)
	if ok {
		return v.(*process.Process), nil
	}

	pid, err := c.pidFn()
	if err != nil {
		return nil, err
	}

	proc, err := process.NewProcess(int32(pid))
	if err != nil {
		return nil, err
	}

	v, _ = procCache.LoadOrStore(c, proc)

	return v.(*process.Process), nil
}
