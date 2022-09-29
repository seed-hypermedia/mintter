package ipfs

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"mintter/backend/pkg/cleanup"

	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-ipns"
	"github.com/libp2p/go-libp2p"
	record "github.com/libp2p/go-libp2p-record"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"

	dht "github.com/libp2p/go-libp2p-kad-dht"
	dualdht "github.com/libp2p/go-libp2p-kad-dht/dual"
	routing "github.com/libp2p/go-libp2p/core/routing"
	"github.com/libp2p/go-libp2p/p2p/net/connmgr"
)

// Bootstrappers is a convenience alias for a list of bootstrap addresses.
// It is to provide some semantic meaning to otherwise unclear slice of addresses.
type Bootstrappers []peer.AddrInfo

// DefaultBootstrapPeers exposes default bootstrap peers from the go-ipfs package,
// failing in case of an error, which should only happen if there's a bug somewhere.
func DefaultBootstrapPeers() Bootstrappers {
	out := make(Bootstrappers, len(DefaultBootstrapAddresses))

	for i, a := range DefaultBootstrapAddresses {
		ai, err := peer.AddrInfoFromString(a)
		if err != nil {
			panic(err)
		}
		out[i] = *ai
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
			err := h.Connect(ctx, pinfo)
			res.ConnectErrs[i] = err
			if err != nil {
				atomic.AddUint32(&res.NumFailedConnections, 1)
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

// Libp2p exposes libp2p host and the underlying routing system (DHT), providing
// some defaults. The node will not be listening, so users must explicitly call Listen()
// on the underlying host's network.
type Libp2p struct {
	host.Host

	ds      datastore.Batching
	Routing routing.Routing

	clean cleanup.Stack
}

// NewLibp2pNode creates a new node. It's a convenience wrapper around the main libp2p package.
// It forces one to pass the peer private key and datastore.
// To the default options of the libp2p package it also adds DHT Routing, Connection Manager, Relay protocol support.
// To actually enable relay you also need to pass EnableAutoRelay, and NATPortMap.
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

	mustConnMgr := func(mgr *connmgr.BasicConnMgr, err error) *connmgr.BasicConnMgr {
		if err != nil {
			panic(err)
		}
		return mgr
	}

	o := []libp2p.Option{
		libp2p.Identity(key),
		libp2p.NoListenAddrs, // Users must explicitly start listening.
		libp2p.EnableRelay(),
		libp2p.ConnectionManager(mustConnMgr(connmgr.NewConnManager(50, 100,
			connmgr.WithGracePeriod(10*time.Minute),
		))),
		libp2p.Routing(func(h host.Host) (routing.PeerRouting, error) {
			if ds == nil {
				panic("BUG: must provide datastore for DHT")
			}

			r, err := dualdht.New(
				ctx, h,
				dualdht.DHTOption(
					dht.Concurrency(10),
					dht.Mode(dht.ModeAuto),
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
