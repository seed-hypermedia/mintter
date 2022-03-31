package relay

import (
	"fmt"
	"net"
	"sync"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"

	relayv1 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay"
	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"

	ma "github.com/multiformats/go-multiaddr"
	manet "github.com/multiformats/go-multiaddr/net"
)

type ACLFilter struct {
	allowPeers   map[peer.ID]struct{}
	allowSubnets []*net.IPNet

	// peer address tracking for v1 relay ACL
	mx    sync.RWMutex
	addrs map[peer.ID]map[ma.Multiaddr]struct{}
}

var _ relayv1.ACLFilter = (*ACLFilter)(nil)
var _ relayv2.ACLFilter = (*ACLFilter)(nil)

func NewACL(h host.Host, cfg aclConfig) (*ACLFilter, error) {
	acl := &ACLFilter{}

	if len(cfg.AllowPeers) > 0 {
		acl.allowPeers = make(map[peer.ID]struct{})
		for _, s := range cfg.AllowPeers {
			p, err := peer.Decode(s)
			if err != nil {
				return nil, fmt.Errorf("error parsing peer ID: %w", err)
			}

			acl.allowPeers[p] = struct{}{}
		}
	}

	if len(cfg.AllowSubnets) > 0 {
		acl.allowSubnets = make([]*net.IPNet, 0, len(cfg.AllowSubnets))
		for _, s := range cfg.AllowSubnets {
			_, ipnet, err := net.ParseCIDR(s)
			if err != nil {
				return nil, fmt.Errorf("error parsing subnet: %w", err)
			}
			acl.allowSubnets = append(acl.allowSubnets, ipnet)
		}

		acl.addrs = make(map[peer.ID]map[ma.Multiaddr]struct{})
		h.Network().Notify(&network.NotifyBundle{
			ConnectedF:    acl.Connected,
			DisconnectedF: acl.Disconnected,
		})
	}

	return acl, nil
}

// relayv2 ACL
func (a *ACLFilter) AllowReserve(p peer.ID, addr ma.Multiaddr) bool {
	if len(a.allowPeers) > 0 {
		_, ok := a.allowPeers[p]
		if !ok {
			return false
		}
	}

	if len(a.allowSubnets) > 0 {
		ip, err := manet.ToIP(addr)
		if err != nil {
			return false
		}

		for _, ipnet := range a.allowSubnets {
			if ipnet.Contains(ip) {
				return true
			}
		}

		return false
	}

	return true
}

func (a *ACLFilter) AllowConnect(src peer.ID, srcAddr ma.Multiaddr, dest peer.ID) bool {
	return true
}

// relayv1 ACL
func (a *ACLFilter) AllowHop(src, dest peer.ID) bool {
	if len(a.allowPeers) > 0 {
		_, ok := a.allowPeers[dest]
		if !ok {
			return false
		}
	}

	if len(a.allowSubnets) > 0 {
		a.mx.RLock()
		defer a.mx.RUnlock()

		addrs := a.addrs[dest]
		for addr := range addrs {
			ip, err := manet.ToIP(addr)
			if err != nil {
				continue
			}

			for _, ipnet := range a.allowSubnets {
				if ipnet.Contains(ip) {
					return true
				}
			}
		}

		return false
	}

	return true
}

// notifications
func (a *ACLFilter) Connected(n network.Network, c network.Conn) {
	p := c.RemotePeer()
	addr := c.RemoteMultiaddr()

	a.mx.Lock()
	defer a.mx.Unlock()

	addrs, ok := a.addrs[p]
	if !ok {
		addrs = make(map[ma.Multiaddr]struct{})
		a.addrs[p] = addrs
	}

	addrs[addr] = struct{}{}
}

func (a *ACLFilter) Disconnected(n network.Network, c network.Conn) {
	p := c.RemotePeer()
	addr := c.RemoteMultiaddr()

	a.mx.Lock()
	defer a.mx.Unlock()

	addrs, ok := a.addrs[p]
	if ok {
		delete(addrs, addr)
		if len(addrs) == 0 {
			delete(a.addrs, p)
		}
	}
}
