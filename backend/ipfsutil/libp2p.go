package ipfsutil

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p/config"
	"github.com/multiformats/go-multiaddr"

	ipns "github.com/ipfs/go-ipns"
	routing "github.com/libp2p/go-libp2p-core/routing"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	dualdht "github.com/libp2p/go-libp2p-kad-dht/dual"
	libp2pquic "github.com/libp2p/go-libp2p-quic-transport"
	record "github.com/libp2p/go-libp2p-record"
	libp2ptls "github.com/libp2p/go-libp2p-tls"
)

// SetupLibp2p returns a routed host and DHT instances that can be used to
// easily create a ipfslite Peer. You may consider to use Peer.Bootstrap()
// after creating the IPFS-Lite Peer to connect to other peers. When the
// datastore parameter is nil, the DHT will use an in-memory datastore, so all
// provider records are lost on program shutdown.
//
// Additional libp2p options can be passed. Note that the Identity,
// ListenAddrs and PrivateNetwork options will be setup automatically.
// Interesting options to pass: NATPortMap() EnableAutoRelay(),
// libp2p.EnableNATService(), DisableRelay(), ConnectionManager(...)... see
// https://godoc.org/github.com/libp2p/go-libp2p#Option for more info.
func SetupLibp2p(
	ctx context.Context,
	hostKey crypto.PrivKey,
	listenAddrs []multiaddr.Multiaddr,
	dsDHT datastore.Batching,
	opts ...libp2p.Option,
) (host.Host, *dualdht.DHT, error) {
	var (
		ddht   *dualdht.DHT
		dhtErr = make(chan error, 1)
	)

	opts = append(opts,
		libp2p.Identity(hostKey),
		libp2p.ListenAddrs(listenAddrs...),
		// This is a weird circular dependency here. Libp2p host depends on
		// the routing system, and routing depends on the host.
		libp2p.Routing(func(h host.Host) (routing.PeerRouting, error) {
			d, err := newDHT(ctx, h, dsDHT)
			if err != nil {
				dhtErr <- err
				return nil, fmt.Errorf("failed to create DHT: %w", err)
			}
			ddht = d
			dhtErr <- nil

			return ddht, err
		}),
	)

	var cfg libp2p.Config
	if err := cfg.Apply(append(opts, libp2p.FallbackDefaults)...); err != nil {
		return nil, nil, fmt.Errorf("failed to apply libp2p options: %w", err)
	}

	h, err := cfg.NewNode(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create libp2p node: %w", err)
	}

	if err := <-dhtErr; err != nil {
		return nil, nil, err
	}

	return h, ddht, nil
}

func newDHT(ctx context.Context, h host.Host, ds datastore.Batching) (*dualdht.DHT, error) {
	dhtOpts := []dualdht.Option{
		dualdht.DHTOption(dht.NamespacedValidator("pk", record.PublicKeyValidator{})),
		dualdht.DHTOption(dht.NamespacedValidator("ipns", ipns.Validator{KeyBook: h.Peerstore()})),
		dualdht.DHTOption(dht.Concurrency(10)),
		dualdht.DHTOption(dht.Mode(dht.ModeAuto)),
	}
	if ds != nil {
		dhtOpts = append(dhtOpts, dualdht.DHTOption(dht.Datastore(ds)))
	}

	return dualdht.New(ctx, h, dhtOpts...)
}

// EnableRelay set sane options for enabling circuit-relay.
func EnableRelay(cfg *config.Config) error {
	return cfg.Apply(
		libp2p.EnableRelay(),
		libp2p.NATPortMap(),
		libp2p.EnableAutoRelay(),
		libp2p.EnableNATService(),
		libp2p.DefaultStaticRelays(),
	)
}

// EnableTLS set sane options for security.
func EnableTLS(cfg *config.Config) error {
	return cfg.Apply(libp2p.Security(libp2ptls.ID, libp2ptls.New))
}

// TransportOpts set sane options for transport.
func TransportOpts(cfg *config.Config) error {
	return cfg.Apply(
		libp2p.Transport(libp2pquic.NewTransport),
		libp2p.DefaultTransports,
	)
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
