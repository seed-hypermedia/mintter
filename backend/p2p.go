package backend

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"net"
	"sync"
	"time"

	"mintter/backend/cleanup"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/event"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	discovery "github.com/libp2p/go-libp2p-discovery"
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
	disc "github.com/libp2p/go-libp2p-discovery"
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

type p2pNodeFactory func() (*p2pNode, error)

func makeP2PNodeFactory(n *p2pNode) p2pNodeFactory {
	return func() (*p2pNode, error) {
		select {
		case <-n.Ready():
			return n, nil
		default:
			return nil, fmt.Errorf("p2p node is not ready")
		}
	}
}

type p2pNode struct {
	cfg   config.P2P
	ds    datastore.Batching
	repo  *repo
	log   *zap.Logger
	clean cleanup.Stack
	ready chan struct{} // this will be closed after node is ready to use.

	bs   blockstore.Blockstore
	ipfs *ipfsutil.Node
	host host.Host
	dht  *dual.DHT
	ps   *pubsub.PubSub

	mu sync.Mutex
	// We only want one subscription per account. Fan-out messages internally if multiple
	// subscribers are interested in the message.
	subs map[AccountID]*subscription
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
		ready: make(chan struct{}),
		bs:    bs,
		subs:  make(map[AccountID]*subscription),
	}, nil
}

// Run the node until ctx is canceled or something fails during the initialization.
func (n *p2pNode) Run(ctx context.Context) (err error) {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-n.repo.Ready():
		// Start the process only after repo is ready.
	}

	n.clean.IgnoreContextCanceled = true

	g, ctx := errgroup.WithContext(ctx)
	defer func() {
		n.clean.AddErrFunc(g.Wait)
		err = multierr.Append(err, n.clean.Close())
	}()

	if err := n.setupLibp2p(ctx); err != nil {
		return fmt.Errorf("failed to setup libp2p: %w", err)
	}

	evts, err := n.host.EventBus().Subscribe(event.WildcardSubscription)
	if err != nil {
		return fmt.Errorf("failed to setup libp2p event bus: %w", err)
	}
	n.clean.Add(evts)
	g.Go(func() error {
		for {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case evt, ok := <-evts.Out():
				if !ok {
					return nil
				}

				if err := n.handleNetworkEvent(evt); err != nil {
					return fmt.Errorf("failed to handle network event: %w", err)
				}
			}
		}
	})

	if err := n.setupPubSub(ctx); err != nil {
		return fmt.Errorf("failed to setup pubsub: %w", err)
	}

	n.maybeBootstrap(ctx)

	lis, err := gostream.Listen(n.host, ProtocolID)
	if err != nil {
		return fmt.Errorf("failed to setup gostream listener: %w", err)
	}
	n.clean.AddErrFunc(func() error {
		if err := lis.Close(); errors.Is(err, net.ErrClosed) {
			return nil
		}
		return err
	})

	n.ipfs, err = ipfsutil.New(ctx, n.ds, n.host, n.dht, &ipfsutil.Config{Blockstore: n.bs})
	if err != nil {
		return fmt.Errorf("failed to setup IPFS node: %w", err)
	}
	n.clean.Add(n.ipfs)

	srv := grpc.NewServer()

	// // TODO: register mintter p2p api here.

	g.Go(func() error {
		return srv.Serve(lis)
	})
	defer srv.GracefulStop()

	n.log.Info("P2PReady", zap.Any("addrs", n.Addrs()))
	close(n.ready)

	<-ctx.Done()
	n.log.Info("P2PShutdownStarted")
	return // will go back to the deferred clean.Close()
}

// Ready can be used to wait until the P2P node is fully ready to use after calling Run().
func (n *p2pNode) Ready() <-chan struct{} {
	return n.ready
}

// Blockstore returns the underlying IPFS Blockstore.
func (n *p2pNode) Blockstore() blockstore.Blockstore {
	return n.bs
}

// ListAccountPeers returns a list of peers that are known to be subscribed
// to the topic related to the given Account ID. This may or may not include
// the actual peers of the given account.
func (n *p2pNode) ListAccountPeers(aid AccountID) []peer.ID {
	return n.ps.ListPeers(accountToTopic(aid))
}

func (n *p2pNode) setupLibp2p(ctx context.Context) error {
	pstore, err := pstoreds.NewPeerstore(ctx, n.ds, pstoreds.DefaultOpts())
	if err != nil {
		return fmt.Errorf("failed to create peerstore: %w", err)
	}
	n.clean.Add(pstore)

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
		opts = append(opts, ipfsutil.EnableRelay)
	}

	if !n.cfg.NoTLS {
		opts = append(opts, ipfsutil.EnableTLS)
	}

	n.host, n.dht, err = ipfsutil.SetupLibp2p(ctx, n.repo.Device().priv, nil, n.ds, opts...)
	if err != nil {
		return err
	}
	n.clean.Add(n.host, n.dht)

	return nil
}

func (n *p2pNode) setupPubSub(ctx context.Context) (err error) {

	var d discovery.Discovery
	{
		d = disc.NewRoutingDiscovery(n.dht)
		minBackoff, maxBackoff := time.Second*60, time.Hour
		rng := rand.New(rand.NewSource(rand.Int63()))
		d, err = disc.NewBackoffDiscovery(d,
			disc.NewExponentialBackoff(minBackoff, maxBackoff, disc.FullJitter, time.Second, 5.0, 0, rng),
		)
		if err != nil {
			return fmt.Errorf("failed to setup topic discovery: %w", err)
		}
	}

	n.ps, err = pubsub.NewGossipSub(ctx, n.host,
		pubsub.WithMessageSigning(false),
		pubsub.WithStrictSignatureVerification(false),
		pubsub.WithDiscovery(d),
		// TODO: enable WithPeerExchange for public nodes.
	)
	if err != nil {
		return err
	}

	acc, err := n.repo.Account()
	if err != nil {
		return fmt.Errorf("failed to get account: %w", err)
	}

	// Subscribe to our own account.
	if _, err := n.subscribe(acc.id); err != nil {
		return fmt.Errorf("failed to subscribe to our own account: %w", err)
	}

	n.clean.AddErrFunc(func() error {
		n.closePubSub()
		return nil
	})

	return nil
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

// PeerAddrs provides addresses for peer ID.
func (n *p2pNode) PeerAddrs(p peer.ID) ([]multiaddr.Multiaddr, error) {
	info := n.host.Peerstore().PeerInfo(p)
	return peer.AddrInfoToP2pAddrs(&info)
}

// Addrs returns our own fully-qualified libp2p addresses.
func (n *p2pNode) Addrs() []multiaddr.Multiaddr {
	mas, err := peer.AddrInfoToP2pAddrs(host.InfoFromHost(n.host))
	if err != nil {
		panic(err) // This should never happen.
	}

	return mas
}

func (n *p2pNode) handleNetworkEvent(evt interface{}) error {
	// should only return error if it's fatal, coz everything will shutdown.
	switch e := evt.(type) {
	case event.EvtPeerIdentificationCompleted, event.EvtPeerProtocolsUpdated:
		// TODO: handle
	case event.EvtLocalReachabilityChanged:
		n.log.Debug("NodeReachabilityChanged", zap.String("reachaility", e.Reachability.String()))
	}

	return nil
}

func (n *p2pNode) maybeBootstrap(ctx context.Context) {
	if n.cfg.NoBootstrap {
		return
	}

	// // TODO: bootstrap ipfs node.
	peers, err := ipfsconfig.DefaultBootstrapPeers()
	if err != nil {
		panic("BUG: failed to get bootstrap peers " + err.Error())
	}

	n.log.Info("BootstrapStarted")
	result := ipfsutil.Bootstrap(ctx, n.host, n.dht, peers)
	n.log.Info("BootstrapEnded",
		zap.Int("totalPeers", len(peers)),
		zap.Uint32("failedConnections", result.NumFailedConnections),
	)
	if result.NumFailedConnections > 0 {
		n.log.Debug("BootstrapErrors", zap.Error(multierr.Combine(result.ConnectErrs...)))
	}
}

func (n *p2pNode) closePubSub() {
	n.mu.Lock()
	defer n.mu.Unlock()
	for aid, s := range n.subs {
		n.log.Debug("ClosedSubscription", zap.String("accountID", aid.String()), zap.Error(s.Close()))
	}
}

func (n *p2pNode) subscribe(aid AccountID) (*subscription, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	sub := n.subs[aid]
	if sub != nil {
		return sub, nil
	}

	topicName := accountToTopic(aid)
	t, err := n.ps.Join(topicName)
	if err != nil {
		return nil, fmt.Errorf("failed to join topic %s: %w", topicName, err)
	}

	s, err := t.Subscribe()
	if err != nil {
		return nil, fmt.Errorf("")
	}

	sub = &subscription{
		T: t,
		S: s,
	}

	n.subs[aid] = sub

	return sub, nil
}

type subscription struct {
	T *pubsub.Topic
	S *pubsub.Subscription
}

// Close closes the underlying subscription and topic.
func (s *subscription) Close() error {
	s.S.Cancel()
	return s.T.Close()
}

func accountToTopic(aid AccountID) string {
	return aid.String() // TODO: form a more sensible topic name
}
