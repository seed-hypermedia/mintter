// Copyright 2019 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//go:build !windows && !js && !wasip1 && !darwin
// +build !windows,!js,!wasip1,!darwin

package procmetrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/procfs"
)

func canCollectProcess() bool {
	_, err := procfs.NewDefaultFS()
	return err == nil
}

func (c *processCollector) processCollect(ch chan<- prometheus.Metric) {
	pid, err := c.pidFn()
	if err != nil {
		c.reportError(ch, nil, err)
		return
	}

	p, err := procfs.NewProc(pid)
	if err != nil {
		c.reportError(ch, nil, err)
		return
	}

	if stat, err := p.Stat(); err == nil {
		ch <- prometheus.MustNewConstMetric(c.cpuTotal, prometheus.CounterValue, stat.CPUTime())
		ch <- prometheus.MustNewConstMetric(c.vsize, prometheus.GaugeValue, float64(stat.VirtualMemory()))
		ch <- prometheus.MustNewConstMetric(c.rss, prometheus.GaugeValue, float64(stat.ResidentMemory()))
		if startTime, err := stat.StartTime(); err == nil {
			ch <- prometheus.MustNewConstMetric(c.startTime, prometheus.GaugeValue, startTime)
		} else {
			c.reportError(ch, c.startTime, err)
		}
	} else {
		c.reportError(ch, nil, err)
	}

	if fds, err := p.FileDescriptorsLen(); err == nil {
		ch <- prometheus.MustNewConstMetric(c.openFDs, prometheus.GaugeValue, float64(fds))
	} else {
		c.reportError(ch, c.openFDs, err)
	}

	if limits, err := p.Limits(); err == nil {
		ch <- prometheus.MustNewConstMetric(c.maxFDs, prometheus.GaugeValue, float64(limits.OpenFiles))
		ch <- prometheus.MustNewConstMetric(c.maxVsize, prometheus.GaugeValue, float64(limits.AddressSpace))
	} else {
		c.reportError(ch, nil, err)
	}
}
