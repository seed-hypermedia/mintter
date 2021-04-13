package p2p

import (
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
		var total int
		for {
			time.Sleep(updateInterval)

			peers = n.GetNetworkPeers()
			total = len(peers)
			networkPeers.Set(float64(total))

			peers = n.GetStorePeers()
			total = len(peers)
			storePeers.Set(float64(total))

			stats := bwc.GetBandwidthTotals()
			bandwidthTotalIn.Set(float64(stats.TotalIn))
			bandwidthTotalOut.Set(float64(stats.TotalOut))
			bandwidthRateIn.Set(stats.RateIn)
			bandwidthRateOut.Set(stats.RateOut)

			/*
				fmt.Println("##")

				for proto, stat := range bwc.GetBandwidthByProtocol() {
					fmt.Println(proto)
					fmt.Println(stat)
					fmt.Println("---")
				}
			*/

		}
	}()
}
