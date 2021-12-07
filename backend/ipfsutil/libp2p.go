package ipfsutil

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"mintter/backend/cleanup"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p/config"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"

	ipfsconfig "github.com/ipfs/go-ipfs-config"
	connmgr "github.com/libp2p/go-libp2p-connmgr"
	routing "github.com/libp2p/go-libp2p-core/routing"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	dualdht "github.com/libp2p/go-libp2p-kad-dht/dual"
	record "github.com/libp2p/go-libp2p-record"
)

// Bootstrappers is a convenience alias for a list of bootstrap addresses.
// It is to provide some semantic meaning to otherwise unclear slice of addresses.
type Bootstrappers []peer.AddrInfo

// DefaultBootstrapPeers exposes default bootstrap peers from the go-ipfs package,
// failing in case of an error, which should only happen if there's a bug somewhere.
func DefaultBootstrapPeers() Bootstrappers {
	peers, err := ipfsconfig.DefaultBootstrapPeers()
	if err != nil {
		panic(err)
	}
	return peers
}

func newDHT(ctx context.Context, h host.Host, ds datastore.Batching, opts ...dualdht.Option) (*dualdht.DHT, error) {
	dhtOpts := []dualdht.Option{
		dualdht.DHTOption(dht.NamespacedValidator("pk", record.PublicKeyValidator{})),
		dualdht.DHTOption(dht.Concurrency(10)),
		dualdht.DHTOption(dht.Mode(dht.ModeAuto)),
	}
	if ds != nil {
		dhtOpts = append(dhtOpts, dualdht.DHTOption(dht.Datastore(ds)))
	}
	dhtOpts = append(dhtOpts, opts...)

	return dualdht.New(ctx, h, dhtOpts...)
}

// TransportOpts set sane options for transport.
func TransportOpts(cfg *config.Config) error {
	return cfg.Apply(libp2p.DefaultTransports)
}

// BootstrapResult is a result of the bootstrap process.
type BootstrapResult struct {
	// ConnectErrs is a list of results from the
	// Connect() call for all the peers in the input order.
	ConnectErrs []error
	// RoutingErr is the result of the bootstrap call
	// from the routing system.
	RoutingErr error
	// NumFailedConnection is the number of total failed connect calls.
	NumFailedConnections uint32
}

// Bootstrap is an optional helper to connect to the given peers and bootstrap
// the Peer DHT (and Bitswap).
// This is a best-effort function, but it blocks.
// It's fine to pass a list where some peers will not be reachable, but caller should
// handle the results however is required by the application.
func Bootstrap(ctx context.Context, h host.Host, rt routing.Routing, peers []peer.AddrInfo) BootstrapResult {
	res := BootstrapResult{
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

	Routing routing.Routing

	bootstrappers []peer.AddrInfo
	clean         cleanup.Stack
}

// NewLibp2pNode creates a new node.
func NewLibp2pNode(key crypto.PrivKey, ds datastore.Batching, bootstrap []peer.AddrInfo, opts ...libp2p.Option) (n *Libp2p, err error) {
	n = &Libp2p{
		bootstrappers: bootstrap,
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

	o := []libp2p.Option{
		libp2p.Identity(key),
		libp2p.NoListenAddrs, // Users must explicitly start listening.
		libp2p.Routing(func(h host.Host) (routing.PeerRouting, error) {
			r, err := newDHT(ctx, h, ds, dualdht.WanDHTOption(dht.BootstrapPeers(bootstrap...)))
			if err != nil {
				return nil, err
			}

			n.Routing = r

			// Routing interface from IPFS doesn't expose Close method,
			// so it actually never gets closed properly, even inside IPFS.
			// This ugly trick attempts to solve this.
			n.clean.AddErrFunc(func() error {
				return r.Close()
			})

			return r, nil
		}),
		libp2p.ConnectionManager(connmgr.NewConnManager(100, 400, time.Minute)),
		TransportOpts,
		libp2p.NATPortMap(),
		libp2p.EnableNATService(),
		libp2p.DisableRelay(),
	}

	o = append(o, opts...)

	n.Host, err = libp2p.New(o...)
	if err != nil {
		return nil, err
	}
	n.clean.Add(n.Host)

	return n, nil
}

// Bootstrap blocks, and performs bootstrapping process for the node,
// including the underlying routing system.
func (n *Libp2p) Bootstrap(ctx context.Context, bootstrappers ...peer.AddrInfo) BootstrapResult {
	if bootstrappers == nil {
		bootstrappers = n.bootstrappers
	}
	return Bootstrap(ctx, n.Host, n.Routing, bootstrappers)
}

// Close the node and all the underlying systems.
func (n *Libp2p) Close() error {
	return n.clean.Close()
}
