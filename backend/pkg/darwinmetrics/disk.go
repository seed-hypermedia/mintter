//go:build darwin
// +build darwin

package darwinmetrics

// #include <sys/resource.h>
// #include <libproc.h>
//
// typedef struct {
//     uint64_t read_bytes;
//     uint64_t write_bytes;
// } disk_io_metrics;
//
// int get_disk_io_metrics(int pid, disk_io_metrics *metrics) {
//     struct rusage_info_v4 info;
//     int rc;
//     rc = proc_pid_rusage(pid, RUSAGE_INFO_V4, (rusage_info_t *)&info);
//     if (rc != 0) {
//         return rc;
//     }
//     metrics->read_bytes = info.ri_diskio_bytesread;
//     metrics->write_bytes = info.ri_diskio_byteswritten;
//     return 0;
// }
import "C"
import (
	"fmt"

	"github.com/prometheus/client_golang/prometheus"
)

func getDiskMetrics(pid int) (C.disk_io_metrics, error) {
	var metrics C.disk_io_metrics
	if rc, err := C.get_disk_io_metrics(C.int(pid), &metrics); rc != 0 {
		return metrics, fmt.Errorf("failed to get disk i/o metrics %d: %w", rc, err)
	}

	return metrics, nil
}

func (c *processCollector) collectDiskIO(ch chan<- prometheus.Metric) {
	metrics, err := getDiskMetrics(int(c.proc.Pid))
	if err != nil {
		c.reportError(ch, nil, err)
	} else {
		ch <- prometheus.MustNewConstMetric(c.diskReads, prometheus.CounterValue, float64(metrics.read_bytes))
		ch <- prometheus.MustNewConstMetric(c.diskWrites, prometheus.CounterValue, float64(metrics.write_bytes))
	}
}
