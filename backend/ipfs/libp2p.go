package ipfs

import (
	"context"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"mintter/backend/pkg/cleanup"
	"mintter/backend/pkg/must"

	"github.com/ipfs/boxo/ipns"
	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	dualdht "github.com/libp2p/go-libp2p-kad-dht/dual"
	"github.com/libp2p/go-libp2p-kad-dht/providers"
	record "github.com/libp2p/go-libp2p-record"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	routing "github.com/libp2p/go-libp2p/core/routing"
	rcmgr "github.com/libp2p/go-libp2p/p2p/host/resource-manager"
	"github.com/libp2p/go-libp2p/p2p/net/connmgr"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
)

// DefaultBootstrapPeers exposes default bootstrap peers from the go-ipfs package,
// failing in case of an error, which should only happen if there's a bug somewhere.
func DefaultBootstrapPeers() []multiaddr.Multiaddr {
	out := make([]multiaddr.Multiaddr, len(DefaultBootstrapAddresses))

	for i, a := range DefaultBootstrapAddresses {
		addr, err := multiaddr.NewMultiaddr(a)
		if err != nil {
			panic(err)
		}
		out[i] = addr
	}

	return out
}

// BootstrapResult is a result of the bootstrap process.
type BootstrapResult struct {
	// Peers that were used for bootstrapping.
	Peers []peer.AddrInfo
	// ConnectErrs is a list of results from the
	// Connect() call for all the peers in the input order.
	ConnectErrs []error
	// RoutingErr is the result of the bootstrap call
	// from the routing system.
	RoutingErr error
	// NumFailedConnection is the number of total failed connect calls.
	NumFailedConnections uint32
}

// Bootstrap the given host and routing using the provided bootstrap peers.
// This function blocks until bootstrapping is complete or context is canceled.
// It's fine to pass peers that might not be reachable. The caller is responsible
// to handle the return value where the result for each peer is presented separately.
func Bootstrap(ctx context.Context, h host.Host, rt routing.Routing, peers []peer.AddrInfo) BootstrapResult {
	res := BootstrapResult{
		Peers:       peers,
		ConnectErrs: make([]error, len(peers)),
	}

	var wg sync.WaitGroup
	wg.Add(len(peers))

	for i, pinfo := range peers {
		go func(i int, pinfo peer.AddrInfo) {
			defer wg.Done()
			// Since we're explicitly connecting to a peer, we want to clear any backoffs
			// that the network might have at the moment.
			{
				sw, ok := h.Network().(*swarm.Swarm)
				if ok {
					sw.Backoff().Clear(pinfo.ID)
				}
			}
			toCtx, cancelFcn := context.WithTimeout(ctx, 8*time.Second)
			defer cancelFcn()
			err := h.Connect(toCtx, pinfo)
			ctxErr := toCtx.Err()

			if err != nil || ctxErr != nil {
				atomic.AddUint32(&res.NumFailedConnections, 1)
				if err != nil {
					res.ConnectErrs[i] = err
				} else {
					res.ConnectErrs[i] = ctxErr
				}

			}
		}(i, pinfo)
	}

	res.RoutingErr = rt.Bootstrap(ctx)
	wg.Wait()

	return res
}

// ParseMultiaddrs parses a slice of string multiaddrs.
func ParseMultiaddrs(in []string) ([]multiaddr.Multiaddr, error) {
	out := make([]multiaddr.Multiaddr, len(in))

	for i, a := range in {
		ma, err := multiaddr.NewMultiaddr(a)
		if err != nil {
			return nil, err
		}
		out[i] = ma
	}

	return out, nil
}

// Libp2p exposes libp2p host and the underlying routing system (DHT).
// It provides some reasonable defaults, and also handles shutdown more gracefully.
type Libp2p struct {
	host.Host

	ds      datastore.Batching
	Routing routing.Routing

	clean cleanup.Stack
}

// NewLibp2pNode creates a new node. It's a convenience wrapper around the main libp2p package.
// It forces one to pass the peer private key and datastore.
// To the default options of the libp2p package it also adds DHT Routing, Connection Manager, Relay protocol support.
// To actually enable relay you also need to pass EnableAutoRelay, and optionally enable HolePunching.
// The returning node won't be listening on the network by default, so users have to start listening manually,
// using the Listen() method on the underlying P2P network.
func NewLibp2pNode(key crypto.PrivKey, ds datastore.Batching, opts ...libp2p.Option) (n *Libp2p, err error) {
	n = &Libp2p{
		ds: ds,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer func() {
		if err != nil {
			err = multierr.Append(err, n.Close())
		}
	}()
	n.clean.AddErrFunc(func() error {
		cancel()
		return nil
	})

	// Start with the default scaling limits.
	scalingLimits := rcmgr.DefaultLimits

	// Add limits around included libp2p protocols
	libp2p.SetDefaultServiceLimits(&scalingLimits)

	// Turn the scaling limits into a concrete set of limits using `.AutoScale`. This
	// scales the limits proportional to your system memory.
	scaledDefaultLimits := scalingLimits.AutoScale()

	// Tweak certain settings
	cfg := rcmgr.PartialLimitConfig{
		System: rcmgr.ResourceLimits{
			Streams: rcmgr.Unlimited,
			Conns:   rcmgr.Unlimited,
			FD:      rcmgr.Unlimited,
			Memory:  rcmgr.Unlimited64,
		},
		Transient: rcmgr.ResourceLimits{
			Streams: rcmgr.Unlimited,
			Conns:   rcmgr.Unlimited,
			FD:      rcmgr.Unlimited,
			Memory:  rcmgr.Unlimited64,
		},
		// Everything else is default. The exact values will come from `scaledDefaultLimits` above.
	}

	// Create our limits by using our cfg and replacing the default values with values from `scaledDefaultLimits`
	limits := cfg.Build(scaledDefaultLimits)

	// The resource manager expects a limiter, so we create one from our limits.
	limiter := rcmgr.NewFixedLimiter(limits)

	rm, err := rcmgr.NewResourceManager(limiter)
	if err != nil {
		panic(err)
	}
	o := []libp2p.Option{
		libp2p.Identity(key),
		libp2p.NoListenAddrs,      // Users must explicitly start listening.
		libp2p.EnableRelay(),      // Be able to dial behind-relay peers and receive connections from them.
		libp2p.EnableNATService(), // Dial other peers on-demand to let them know if they are reachable.
		libp2p.ConnectionManager(must.Do2(connmgr.NewConnManager(50, 100,
			connmgr.WithGracePeriod(10*time.Minute),
		))),
		libp2p.ResourceManager(rm),
		libp2p.Routing(func(h host.Host) (routing.PeerRouting, error) {
			if ds == nil {
				panic("BUG: must provide datastore for DHT")
			}

			// The DHT code creates this automatically to store providing records,
			// but the problem is that it doesn't close it properly. When this provider
			// manager wants to flush records into the database, we would have closed the database
			// already. Because of this we always have an annoying error during our shutdown.
			// Here we manually ensure all the goroutines started by provider manager are closed.
			provStore, err := providers.NewProviderManager(h.ID(), h.Peerstore(), ds)
			if err != nil {
				return nil, err
			}
			n.clean.Add(provStore)

			r, err := dualdht.New(
				ctx, h,
				dualdht.DHTOption(
					dht.Concurrency(10),
					dht.Mode(dht.ModeAuto),
					dht.ProviderStore(provStore),
					dht.Datastore(ds),
					dht.Validator(record.NamespacedValidator{
						"pk":   record.PublicKeyValidator{},
						"ipns": ipns.Validator{KeyBook: h.Peerstore()},
					}),
				),
				// LAN DHT should always be in server mode.
				dualdht.LanDHTOption(dht.Mode(dht.ModeServer)),
			)
			if err != nil {
				return nil, err
			}

			// Routing interface from IPFS doesn't expose Close method,
			// so it actually never gets closed properly, even inside IPFS.
			// This ugly trick attempts to solve this.
			// n.clean.Add(r)
			n.clean.AddErrFunc(func() error {
				return r.Close()
			})

			n.Routing = r

			return r, nil
		}),
	}

	o = append(o, opts...)

	n.Host, err = libp2p.New(o...)
	if err != nil {
		return nil, err
	}
	n.clean.Add(n.Host)

	return n, nil
}

// AddrsFull returns a list of fully-qualified multiaddrs.
func (n *Libp2p) AddrsFull() []multiaddr.Multiaddr {
	info := n.AddrInfo()
	addrs, err := peer.AddrInfoToP2pAddrs(&info)
	if err != nil {
		panic(err)
	}

	return addrs
}

// AddrInfo returns the addresses of the running node.
func (n *Libp2p) AddrInfo() peer.AddrInfo {
	return peer.AddrInfo{
		ID:    n.Host.ID(),
		Addrs: n.Host.Addrs(),
	}
}

// Datastore returns the underlying datastore for convenience.
func (n *Libp2p) Datastore() datastore.Batching {
	return n.ds
}

// Bootstrap blocks, and performs bootstrapping process for the node,
// including the underlying routing system.
func (n *Libp2p) Bootstrap(ctx context.Context, bootstrappers []peer.AddrInfo) BootstrapResult {
	return Bootstrap(ctx, n.Host, n.Routing, bootstrappers)
}

// Close the node and all the underlying systems.
func (n *Libp2p) Close() error {
	return n.clean.Close()
}

// DefaultListenAddrs creates the default listening addresses for a given port,
// including all the default transport. This is borrowed from Kubo.
func DefaultListenAddrs(port int) []string {
	portstr := strconv.Itoa(port)
	return []string{
		"/ip4/0.0.0.0/tcp/" + portstr,
		"/ip6/::/tcp/" + portstr,
		"/ip4/0.0.0.0/udp/" + portstr + "/quic-v1",
		"/ip4/0.0.0.0/udp/" + portstr + "/quic-v1/webtransport",
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
