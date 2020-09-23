package ipfsutil

import (
	"context"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p/config"
	"github.com/multiformats/go-multiaddr"

	ipns "github.com/ipfs/go-ipns"
	routing "github.com/libp2p/go-libp2p-core/routing"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	dualdht "github.com/libp2p/go-libp2p-kad-dht/dual"
	libp2pquic "github.com/libp2p/go-libp2p-quic-transport"
	record "github.com/libp2p/go-libp2p-record"
	secio "github.com/libp2p/go-libp2p-secio"
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
		ddht *dualdht.DHT
		err  error
	)

	opts = append(opts,
		libp2p.Identity(hostKey),
		libp2p.ListenAddrs(listenAddrs...),
		libp2p.Routing(func(h host.Host) (routing.PeerRouting, error) {
			ddht, err = newDHT(ctx, h, dsDHT)
			return ddht, err
		}),
	)

	h, err := libp2p.New(ctx, opts...)
	if err != nil {
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

// RelayOpts set sane options for enabling circuit-relay.
func RelayOpts(cfg *config.Config) error {
	return cfg.Apply(
		libp2p.NATPortMap(),
		libp2p.EnableAutoRelay(),
		libp2p.EnableNATService(),
		libp2p.DefaultStaticRelays(),
	)
}

// SecurityOpts set sane options for security.
func SecurityOpts(cfg *config.Config) error {
	return cfg.Apply(
		libp2p.Security(libp2ptls.ID, libp2ptls.New),
		libp2p.Security(secio.ID, secio.New),
	)
}

// TransportOpts set sane options for transport.
func TransportOpts(cfg *config.Config) error {
	return cfg.Apply(
		libp2p.Transport(libp2pquic.NewTransport),
		libp2p.DefaultTransports,
	)
}
