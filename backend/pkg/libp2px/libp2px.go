// Package libp2px provides useful utility functions for libp2p.
// Most of these should probably exist in the upstream libp2p,
// but for some reason they don't
package libp2px

import (
	"strconv"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/multiformats/go-multiaddr"
	manet "github.com/multiformats/go-multiaddr/net"
)

// Host is a wrapper around libp2p.Host
// with additional convenience methods.
type Host struct {
	host.Host
}

// AddrInfo returns the peer.AddrInfo of the given host.
func (h Host) AddrInfo() peer.AddrInfo {
	return AddrInfo(h.Host)
}

// AddrInfo returns the peer.AddrInfo of the given host.
func AddrInfo(h host.Host) peer.AddrInfo {
	return peer.AddrInfo{
		ID:    h.ID(),
		Addrs: h.Addrs(),
	}
}

// DefaultListenAddrs creates the default listening addresses for a given port,
// including all the default transport. This is borrowed from Kubo.
func DefaultListenAddrs(port int) []string {
	portstr := strconv.Itoa(port)
	return []string{
		"/ip4/0.0.0.0/tcp/" + portstr,
		"/ip4/0.0.0.0/udp/" + portstr + "/quic-v1",
		"/ip4/0.0.0.0/udp/" + portstr + "/quic-v1/webtransport",
		"/ip6/::/tcp/" + portstr,
		"/ip6/::/udp/" + portstr + "/quic-v1",
		"/ip6/::/udp/" + portstr + "/quic-v1/webtransport",
	}
}

// DefaultListenAddrsDNS creates the default listening addresses for a DNS name and port.
func DefaultListenAddrsDNS(hostname string, port int) []string {
	portstr := strconv.Itoa(port)
	return []string{
		"/dns4/" + hostname + "/tcp/" + portstr,
		"/dns4/" + hostname + "/udp/" + portstr + "/quic-v1",
		"/dns4/" + hostname + "/udp/" + portstr + "/quic-v1/webtransport",
	}
}

// WithPublicAddrsOnly returns an option that configures the libp2p host
// to only announce public addresses to the network.
// Useful for nodes that are known to be publicly routable.
// Using libp2p.ForceReachabilityPublic could also be useful for such nodes.
// Note that it will only filter addresses if there's actually at least one public address.
// Otherwise it will return the original list of addresses to avoid weird behaviors.
// In this case ForceReachabilityPublic option would be undesirable though.
func WithPublicAddrsOnly() libp2p.Option {
	// Filter the slice of addrs in place.
	// It's safe because each call to host.Addrs() allocates a new slice.
	return libp2p.AddrsFactory(func(addrs []multiaddr.Multiaddr) []multiaddr.Multiaddr {
		j := 0
		for i := range addrs {
			if manet.IsPublicAddr(addrs[i]) {
				addrs[j] = addrs[i]
				j++
			}
		}

		// If the original list doesn't have any public addresses,
		// which don't to filter it to avoid breaking things.
		if j == 0 {
			return addrs
		}

		return addrs[:j]
	})
}
