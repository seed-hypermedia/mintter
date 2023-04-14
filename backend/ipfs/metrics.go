package ipfs

import (
	"sync"
	"time"

	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/metrics"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	"github.com/prometheus/client_golang/prometheus"
)

// Libp2pMetrics implements Libp2p metrics.Reporter and prometheus.Collector.
// It is passed to Libp2p constructor as a BandwidthCounter, and then registered
// with Prometheus global registry.
type Libp2pMetrics struct {
	h host.Host

	errorsTotal    prometheus.Counter
	totalIn        prometheus.Counter
	totalOut       prometheus.Counter
	protocolIn     *prometheus.CounterVec
	protocolOut    *prometheus.CounterVec
	openConns      prometheus.Gauge
	connectedPeers *prometheus.GaugeVec

	allMetrics []prometheus.Collector

	// Collecting connection metrics is a bit expensive, so we only want to do it
	// once per interval. The default is defined in NewLibp2pMetrics.
	ExportInterval time.Duration
	mu             sync.Mutex
	lastExportTime time.Time
}

// NewLibp2pMetrics creates new Libp2pMetricsCollector.
// Callers must call .SetHost() when Libp2p Host is initialized.
// The caller is also responsible for passing the collection
// to the libp2p constructor, and the corresponding Prometheus registry.
func NewLibp2pMetrics() *Libp2pMetrics {
	m := &Libp2pMetrics{
		errorsTotal: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "libp2p_exporter_errors_total",
			Help: "Total number of errors occurred when collecting libp2p metrics.",
		}),

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

		openConns: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "libp2p_open_connections",
			Help: "Number of currently open Libp2p connections.",
		}),

		connectedPeers: prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: "libp2p_connected_peers",
			Help: "Number of currently connected Libp2p peers per protocol.",
		}, []string{"protocol"}),

		ExportInterval: 15 * time.Second,
	}

	m.allMetrics = []prometheus.Collector{
		m.errorsTotal,
		m.totalIn,
		m.totalOut,
		m.protocolIn,
		m.protocolOut,
		m.openConns,
		m.connectedPeers,
	}

	return m
}

// SetHost must be called before registering collector.
// Some metrics are provided in the libp2p constructor, but others can only be
// collected after the Host is instantiated.
func (m *Libp2pMetrics) SetHost(h host.Host) {
	m.h = h
}

// Describe implements prometheus.Collector.
func (m *Libp2pMetrics) Describe(c chan<- *prometheus.Desc) {
	if m.h == nil {
		panic("BUG: call SetHost() before registering the collector")
	}

	for _, m := range m.allMetrics {
		m.Describe(c)
	}
}

// Collect implements prometheus.Collector.
func (m *Libp2pMetrics) Collect(c chan<- prometheus.Metric) {
	if m.h == nil {
		panic("BUG: call SetHost() before registering the collector")
	}

	if m.shouldCollect(time.Now()) {
		m.collectConnectionStats()
	}

	for _, m := range m.allMetrics {
		m.Collect(c)
	}
}

func (m *Libp2pMetrics) shouldCollect(now time.Time) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	ok := now.Sub(m.lastExportTime) > m.ExportInterval
	if ok {
		m.lastExportTime = now
	}
	return ok
}

func (m *Libp2pMetrics) collectConnectionStats() {
	conns := m.h.Network().Conns()
	peers := make(map[peer.ID]struct{}, len(conns))

	for _, c := range conns {
		pid := c.RemotePeer()
		_, ok := peers[pid]
		if ok {
			continue
		}
		peers[pid] = struct{}{}
	}

	m.openConns.Set(float64(len(conns)))

	m.connectedPeers.Reset()
	m.connectedPeers.WithLabelValues("").Set(float64(len(peers)))

	ps := m.h.Peerstore()

	for pid := range peers {
		protos, err := ps.GetProtocols(pid)
		if err != nil {
			m.errorsTotal.Inc()
			continue
		}

		for _, p := range protos {
			m.connectedPeers.WithLabelValues(string(p)).Inc()
		}
	}
}

// LogSentMessage implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) LogSentMessage(v int64) {
	m.totalOut.Add(float64(v))
}

// LogRecvMessage implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) LogRecvMessage(v int64) {
	m.totalIn.Add(float64(v))
}

// LogSentMessageStream implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) LogSentMessageStream(v int64, proto protocol.ID, pid peer.ID) {
	m.protocolOut.WithLabelValues(string(proto)).Add(float64(v))
}

// LogRecvMessageStream implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) LogRecvMessageStream(v int64, proto protocol.ID, pid peer.ID) {
	m.protocolIn.WithLabelValues(string(proto)).Add(float64(v))
}

// GetBandwidthForPeer implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) GetBandwidthForPeer(peer.ID) metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthForProtocol implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) GetBandwidthForProtocol(protocol.ID) metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthTotals implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) GetBandwidthTotals() metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthByPeer implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) GetBandwidthByPeer() map[peer.ID]metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}

// GetBandwidthByProtocol implements libp2p metrics.Reporter.
func (m *Libp2pMetrics) GetBandwidthByProtocol() map[protocol.ID]metrics.Stats {
	panic("BUG: this is not implemented and must never be called")
}
