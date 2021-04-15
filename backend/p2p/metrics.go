package p2p

import (
	"mintter/backend/monitoring"
	"time"

	"github.com/libp2p/go-libp2p-core/metrics"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	updateInterval = 10 * time.Second
	networkPeers   = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "libp2p_network_peers_total",
		Help: "The total number of connected peers",
	})
	storePeers = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "libp2p_store_peers_total",
		Help: "The total number of peers in the peer store",
	})
	bandwidthTotalIn = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "libp2p_bandwidth_total_in",
		Help: "The total amount of incoming bandwidth",
	})
	bandwidthTotalOut = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "libp2p_bandwidth_total_out",
		Help: "The total amount of outcoming bandwidth",
	})
	bandwidthRateIn = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "libp2p_bandwidth_rate_in",
		Help: "The total amount of incoming rate bandwidth",
	})
	bandwidthRateOut = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "libp2p_bandwidth_rate_out",
		Help: "The total amount of outcoming rate bandwidth",
	})
)

func (n *Node) StartMetrics() {
	bwc := metrics.NewBandwidthCounter()
	go func() {
		var peers []peer.ID
		for {
			time.Sleep(updateInterval)

			peers = n.GetNetworkPeers()
			totalNetworkPeers := len(peers)
			networkPeers.Set(float64(totalNetworkPeers))

			peers = n.GetStorePeers()
			totalStorePeers := len(peers)
			storePeers.Set(float64(totalStorePeers))

			stats := bwc.GetBandwidthTotals()
			bandwidthTotalIn.Set(float64(stats.TotalIn))
			bandwidthTotalOut.Set(float64(stats.TotalOut))
			bandwidthRateIn.Set(stats.RateIn)
			bandwidthRateOut.Set(stats.RateOut)

			metrics := map[string]float64{
				"libp2p_network_peers_total": float64(totalNetworkPeers),
				"libp2p_store_peers_total":   float64(totalStorePeers),
				"libp2p_bandwidth_total_in":  float64(stats.TotalIn),
				"libp2p_bandwidth_total_out": float64(stats.TotalOut),
				"libp2p_bandwidth_rate_in":   stats.RateIn,
				"libp2p_bandwidth_rate_out":  stats.RateOut,
			}
			monitoring.SendMetrics(metrics)

			// Can we Read() or Get() the last value of the metric?
			// for proto, stat := range bwc.GetBandwidthByProtocol() { ... }
		}
	}()
}
