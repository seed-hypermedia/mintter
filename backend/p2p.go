package backend

import (
	"context"
	"fmt"
	"time"

	"mintter/backend/config"
	"mintter/backend/ipfsutil"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/libp2p/go-libp2p-kad-dht/dual"
	"github.com/libp2p/go-libp2p-peerstore/pstoreds"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
	ipfsconfig "github.com/ipfs/go-ipfs-config"
	connmgr "github.com/libp2p/go-libp2p-connmgr"
	gostream "github.com/libp2p/go-libp2p-gostream"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	swarm "github.com/libp2p/go-libp2p-swarm"
)

// Prototcol values.
const (
	ProtocolVersion = "0.0.1"
	ProtocolName    = "mintter"

	ProtocolID protocol.ID = "/" + ProtocolName + "/" + ProtocolVersion
)

var userAgent = "mintter/" + Version

type p2pNode struct {
	cfg  config.P2P
	ds   datastore.Batching
	repo *repo
	log  *zap.Logger

	ready chan struct{} // this will be closed after node is ready to use.

	bs   blockstore.Blockstore
	ipfs *ipfsutil.Node
	host host.Host
	dht  *dual.DHT
	ps   *pubsub.PubSub
}

func newP2PNode(cfg config.P2P, repo *repo, log *zap.Logger, ds datastore.Batching) (*p2pNode, error) {
	bs, err := ipfsutil.NewBlockstore(ds)
	if err != nil {
		return nil, fmt.Errorf("failed to setup blockstore: %w", err)
	}

	return &p2pNode{
		cfg:   cfg,
		ds:    ds,
		repo:  repo,
		log:   log,
		bs:    bs,
		ready: make(chan struct{}),
	}, nil
}

func (n *p2pNode) Run(ctx context.Context) (err error) {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-n.repo.Ready():
		// Start the process only after repo is ready.
	}

	_ = gostream.Dial

	g, ctx := errgroup.WithContext(ctx)

	pstore, err := pstoreds.NewPeerstore(ctx, n.ds, pstoreds.DefaultOpts())
	if err != nil {
		return fmt.Errorf("failed to create peerstore: %w", err)
	}
	defer func() {
		n.log.Debug("ClosedPeerStore", zap.Error(pstore.Close()))
	}()

	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(n.cfg.Addr),
		libp2p.ConnectionManager(connmgr.NewConnManager(100, 400, time.Minute)),
		ipfsutil.TransportOpts,
		libp2p.Peerstore(pstore),
		libp2p.UserAgent(userAgent),
		libp2p.DisableRelay(),
		// TODO(burdiyan): allow to enable this for nodes with public IPs.
		// libp2p.EnableRelay(relay.OptHop),
	}

	if !n.cfg.NoRelay {
		opts = append(opts, ipfsutil.RelayOpts)
	}

	if !n.cfg.NoTLS {
		opts = append(opts, ipfsutil.SecurityOpts)
	}

	n.host, n.dht, err = ipfsutil.SetupLibp2p(ctx, n.repo.Device().priv, nil, n.ds, opts...)
	if err != nil {
		return fmt.Errorf("failed to setup libp2p: %w", err)
	}
	defer func() {
		// TODO: log or multierr.Append to bubble up?
		n.log.Debug("ClosedDHT", zap.Error(n.dht.Close()))
		n.log.Debug("ClosedLibp2p", zap.Error(n.host.Close()))
	}()

	n.ps, err = pubsub.NewGossipSub(ctx, n.host,
		pubsub.WithMessageSigning(false),
		pubsub.WithStrictSignatureVerification(false),
		// TODO: add WithReadiness, and WithDiscovery.
		// TODO: enable WithPeerExchange for public nodes.
	)
	if err != nil {
		return fmt.Errorf("failed to setup pubsub: %w", err)
	}

	lis, err := gostream.Listen(n.host, ProtocolID)
	if err != nil {
		return fmt.Errorf("failed to setup gostream listener: %w", err)
	}
	defer lis.Close()

	n.ipfs, err = ipfsutil.New(ctx, n.ds, n.host, n.dht, &ipfsutil.Config{Blockstore: n.bs})
	if err != nil {
		return fmt.Errorf("failed to setup IPFS node: %w", err)
	}
	defer func() {
		n.log.Debug("ClosedIPFSNode", zap.Error(n.ipfs.Close()))
	}()

	srv := grpc.NewServer()

	// // TODO: register mintter p2p api here.

	g.Go(func() error {
		return srv.Serve(lis)
	})

	g.Go(func() error {
		<-ctx.Done()
		srv.GracefulStop()
		return ctx.Err()
	})

	if !n.cfg.NoBootstrap {
		// // TODO: bootstrap ipfs node.
		peers, err := ipfsconfig.DefaultBootstrapPeers()
		if err != nil {
			return fmt.Errorf("failed to get bootstrap peers: %w", err)
		}
		n.log.Info("BootstrapStarted")
		err = n.ipfs.Bootstrap(ctx, peers)
		n.log.Info("BootstrapEnded", zap.Error(err))
	}

	// n.ps = ps
	// n.host = h
	// n.ipfs = ipfsnode

	close(n.ready)

	// TODO: log peer ids, multiaddrs and so on.
	n.log.Info("P2PReady", zap.Any("addrs", n.Addrs()))

	<-ctx.Done()
	n.log.Info("P2PShutdownStarted")

	return g.Wait()
}

// Ready can be used to wait until the P2P node is fully ready to use after calling Run().
func (n *p2pNode) Ready() <-chan struct{} {
	return n.ready
}

// Blockstore returns the underlying IPFS Blockstore.
func (n *p2pNode) Blockstore() blockstore.Blockstore {
	return n.bs
}

// Connect to a peer using one of the provided addresses.
// It will return as soon as the first successful connection occurs.
//
// TODO(burdiyan): should this be connecting to multiple peers at the same time?
func (n *p2pNode) Connect(ctx context.Context, addrs ...multiaddr.Multiaddr) error {
	pinfos, err := peer.AddrInfosFromP2pAddrs(addrs...)
	if err != nil {
		return fmt.Errorf("failed to extract peer info: %w", err)
	}

	// We have to stop when we've connected to at least one provided address.
	for _, pinfo := range pinfos {
		connErr := n.connect(ctx, pinfo)
		if connErr == nil {
			return nil
		}
		err = multierr.Append(err, connErr)
	}

	return err
}

func (n *p2pNode) connect(ctx context.Context, pinfo peer.AddrInfo) error {
	if swarm, ok := n.host.Network().(*swarm.Swarm); ok {
		// clear backoff b/c we're explicitly dialing this peer
		swarm.Backoff().Clear(pinfo.ID)
	}

	if err := n.host.Connect(ctx, pinfo); err != nil {
		return fmt.Errorf("failed to connect %s: %w", pinfo.ID.Pretty(), err)
	}

	// prof, err := n.handshake(ctx, pinfo.ID)
	// if err != nil {
	// 	return fmt.Errorf("failed invoking handshake to %s: %w", pinfo.ID.Pretty(), err)
	// }
	// // Best-effort attempt to delete a suggested profile just in case this peer was one of these.
	// defer func() {
	// 	if err := n.store.DeleteSuggestedProfile(ctx, prof.ID); err != nil {
	// 		_ = err
	// 	}
	// }()

	// if err := n.savePeerProfile(ctx, prof); err != nil {
	// 	// TODO: if the err is ErrQriProtocolNotSupported, let the user know the
	// 	// connection has been established, but that the Qri Protocol is not supported
	// 	return fmt.Errorf("failed to save peer profile: %w", err)
	// }

	return nil
}

// Addrs returns our own fully-qualified libp2p addresses.
func (n *p2pNode) Addrs() []multiaddr.Multiaddr {
	mas, err := peer.AddrInfoToP2pAddrs(host.InfoFromHost(n.host))
	if err != nil {
		panic(err) // This should never happen.
	}

	return mas
}
