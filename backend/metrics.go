package backend

import (
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/metrics"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

func init() {
	prometheus.MustRegister(
		newBadgerCollector(),
		collectors.NewBuildInfoCollector(),
	)
}

// This is copied from Dgraph codebase. Badger uses expvar for its metrics
// hence this is needed.
func newBadgerCollector() prometheus.Collector {
	return collectors.NewExpvarCollector(map[string]*prometheus.Desc{
		"badger_v3_disk_reads_total": prometheus.NewDesc(
			"badger_disk_reads_total",
			"Number of cumulative reads by Badger.",
			nil, nil,
		),
		"badger_v3_disk_writes_total": prometheus.NewDesc(
			"badger_disk_writes_total",
			"Number of cumulative writes by Badger.",
			nil, nil,
		),
		"badger_v3_read_bytes": prometheus.NewDesc(
			"badger_read_bytes",
			"Number of cumulative bytes read by Badger.",
			nil, nil,
		),
		"badger_v3_written_bytes": prometheus.NewDesc(
			"badger_written_bytes",
			"Number of cumulative bytes written by Badger.",
			nil, nil,
		),
		"badger_v3_lsm_level_gets_total": prometheus.NewDesc(
			"badger_lsm_level_gets_total",
			"Total number of LSM gets.",
			[]string{"level"}, nil,
		),
		"badger_v3_lsm_bloom_hits_total": prometheus.NewDesc(
			"badger_lsm_bloom_hits_total",
			"Total number of LSM bloom hits.",
			[]string{"level"}, nil,
		),
		"badger_v3_gets_total": prometheus.NewDesc(
			"badger_gets_total",
			"Total number of gets.",
			nil, nil,
		),
		"badger_v3_puts_total": prometheus.NewDesc(
			"badger_puts_total",
			"Total number of puts.",
			nil, nil,
		),
		"badger_v3_memtable_gets_total": prometheus.NewDesc(
			"badger_memtable_gets_total",
			"Total number of memtable gets.",
			nil, nil,
		),
		"badger_v3_lsm_size_bytes": prometheus.NewDesc(
			"badger_lsm_size_bytes",
			"Size of the LSM in bytes.",
			[]string{"dir"}, nil,
		),
		"badger_v3_vlog_size_bytes": prometheus.NewDesc(
			"badger_vlog_size_bytes",
			"Size of the value log in bytes.",
			[]string{"dir"}, nil,
		),
	})
}

// libp2pCollector implements Libp2p metrics.Reporter and prometheus.Collector.
// It is passed to Libp2p constructor as a BandwidthCounter, and then registered
// with Prometheus global registry.
type libp2pCollector struct {
	totalIn  prometheus.Counter
	totalOut prometheus.Counter

	protocolIn  *prometheus.CounterVec
	protocolOut *prometheus.CounterVec

	h host.Host

	openConns      *prometheus.Desc
	connectedPeers *prometheus.Desc
}

func newLibp2pCollector() *libp2pCollector {
	return &libp2pCollector{
		totalIn: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "libp2p_receive_bytes_total",
			Help: "Total number of bytes received via Libp2p.",
		}),
		totalOut: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "libp2p_transmit_bytes_total",
			Help: "Total number of bytes sent via Libp2p.",
		}),

		protocolIn: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "libp2p_protocol_receive_bytes_total",
			Help: "Total number of bytes received on a specified Libp2p protocol.",
		}, []string{"protocol"}), // Be careful changing labels, we're using WithLabelValues.

		protocolOut: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "libp2p_protocol_transmit_bytes_total",
			Help: "Total number of bytes sent on a specified Libp2p protocol.",
		}, []string{"protocol"}), // Be careful changing labels, we're using WithLabelValues.

		openConns: prometheus.NewDesc(
			"libp2p_open_connections",
			"Number of currently open Libp2p connections.",
			nil, nil,
		),

		connectedPeers: prometheus.NewDesc(
			"libp2p_connected_peers",
			"Number of currently connected Libp2p peers.",
			nil, nil,
		),
	}
}

// SetHost must be called before registering collector.
// Some metrics are provided in the libp2p constructor, but others can only be
// collected after the Host is instantiated.
func (m *libp2pCollector) SetHost(h host.Host) {
	m.h = h
}

// Describe implements prometheus.Collector.
func (m *libp2pCollector) Describe(c chan<- *prometheus.Desc) {
	if m.h == nil {
		panic("BUG: call SetHost() before registering the collector")
	}

	c <- m.openConns
	m.totalIn.Describe(c)
	m.totalOut.Describe(c)
	m.protocolIn.Describe(c)
	m.protocolOut.Describe(c)
}

// Collect implements prometheus.Collector.
func (m *libp2pCollector) Collect(c chan<- prometheus.Metric) {
	if m.h == nil {
		panic("BUG: call SetHost() before registering the collector")
	}

	conns := m.h.Network().Conns()
	peers := make(map[peer.ID]struct{}, len(conns))

	for _, c := range conns {
		peers[c.RemotePeer()] = struct{}{}
	}

	c <- prometheus.MustNewConstMetric(m.connectedPeers, prometheus.GaugeValue, float64(len(peers)))
	c <- prometheus.MustNewConstMetric(m.openConns, prometheus.GaugeValue, float64(len(conns)))
	m.totalIn.Collect(c)
	m.totalOut.Collect(c)
	m.protocolIn.Collect(c)
	m.protocolOut.Collect(c)
}

// LogSentMessage implements libp2p metrics.Reporter.
func (m *libp2pCollector) LogSentMessage(v int64) {
	m.totalOut.Add(float64(v))
}

// LogRecvMessage implements libp2p metrics.Reporter.
func (m *libp2pCollector) LogRecvMessage(v int64) {
	m.totalIn.Add(float64(v))
}

// LogSentMessageStream implements libp2p metrics.Reporter.
func (m *libp2pCollector) LogSentMessageStream(v int64, proto protocol.ID, pid peer.ID) {
	m.protocolOut.WithLabelValues(string(proto)).Add(float64(v))
}

// LogRecvMessageStream implements libp2p metrics.Reporter.
func (m *libp2pCollector) LogRecvMessageStream(v int64, proto protocol.ID, pid peer.ID) {
	m.protocolIn.WithLabelValues(string(proto)).Add(float64(v))
}

// GetBandwidthForPeer implements libp2p metrics.Reporter.
func (m *libp2pCollector) GetBandwidthForPeer(peer.ID) metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthForProtocol implements libp2p metrics.Reporter.
func (m *libp2pCollector) GetBandwidthForProtocol(protocol.ID) metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthTotals implements libp2p metrics.Reporter.
func (m *libp2pCollector) GetBandwidthTotals() metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthByPeer implements libp2p metrics.Reporter.
func (m *libp2pCollector) GetBandwidthByPeer() map[peer.ID]metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthByProtocol implements libp2p metrics.Reporter.
func (m *libp2pCollector) GetBandwidthByProtocol() map[protocol.ID]metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}
