// Package mttnet provides Mintter P2P network functionality.
package mttnet

import (
	"context"
	"fmt"
	"io"
	"mintter/backend/config"
	"mintter/backend/core"
	groups "mintter/backend/genproto/groups/v1alpha"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/cleanup"
	"mintter/backend/pkg/must"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	provider "github.com/ipfs/boxo/provider"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	dssync "github.com/ipfs/go-datastore/sync"
	manet "github.com/multiformats/go-multiaddr/net"
	"github.com/prometheus/client_golang/prometheus"
	"golang.org/x/sync/errgroup"

	"github.com/libp2p/go-libp2p"
	gostream "github.com/libp2p/go-libp2p-gostream"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/libp2p/go-libp2p/p2p/host/peerstore/pstoreds"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

// Protocol values.
const (
	protocolPrefix  = "/hypermedia/"
	protocolVersion = "0.2.0"

	ProtocolID protocol.ID = protocolPrefix + protocolVersion

	protocolSupportKey = "mintter-support" // This is what we use as a key to protect the connection in ConnManager.
)

var userAgent = "mintter/<dev>"

// WebsiteClient is the bridge to talk to remote sites.
type WebsiteClient interface {
	// InitializeServer instruct the website that starts serving a given group.
	InitializeServer(context.Context, *groups.InitializeServerRequest, ...grpc.CallOption) (*groups.InitializeServerResponse, error)

	// GetSiteInfo gets public site information, to be also found in /.well-known/hypermedia-site
	GetSiteInfo(context.Context, *groups.GetSiteInfoRequest, ...grpc.CallOption) (*groups.PublicSiteInfo, error)

	// PublishBlobs pushes given blobs to the site.
	PublishBlobs(context.Context, *groups.PublishBlobsRequest, ...grpc.CallOption) (*groups.PublishBlobsResponse, error)
}

// DefaultRelays bootstrap mintter-owned relays so they can reserve slots to do holepunch.
func DefaultRelays() []peer.AddrInfo {
	return []peer.AddrInfo{
		// Mintter prod server
		{
			ID: must.Do2(peer.Decode("12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq")),
			Addrs: []multiaddr.Multiaddr{
				must.Do2(multiaddr.NewMultiaddr("/ip4/23.20.24.146/tcp/4002")),
				must.Do2(multiaddr.NewMultiaddr("/ip4/23.20.24.146/udp/4002/quic")),
			},
		},
		// Mintter test server
		{
			ID: must.Do2(peer.Decode("12D3KooWGvsbBfcbnkecNoRBM7eUTiuriDqUyzu87pobZXSdUUsJ")),
			Addrs: []multiaddr.Multiaddr{
				must.Do2(multiaddr.NewMultiaddr("/ip4/52.22.139.174/tcp/4002")),
				must.Do2(multiaddr.NewMultiaddr("/ip4/52.22.139.174/udp/4002/quic")),
			},
		},
	}
}

type docInfo struct {
	ID      string
	Version string
}

// PublicationRecord holds the information of a published document (record) on a site.
type PublicationRecord struct {
	Document   docInfo
	Path       string
	Hostname   string
	References []docInfo
}

// Server holds the p2p functionality to be accessed via gRPC.
type rpcMux struct {
	Node *Node
}

// Node is a Mintter P2P node.
type Node struct {
	log      *zap.Logger
	blobs    *hyper.Storage
	db       *sqlitex.Pool
	me       core.Identity
	cfg      config.P2P
	invoicer Invoicer
	client   *Client

	p2p       *ipfs.Libp2p
	bitswap   *ipfs.Bitswap
	providing provider.System
	grpc      *grpc.Server
	quit      io.Closer
	ready     chan struct{}
	ctx       context.Context // will be set after calling Start()
}

// Synchronizer is a subset of the syncing service that
// is able to sync content with remote peers on demand.
type Synchronizer interface {
	SyncWithPeer(ctx context.Context, device peer.ID, initialObjects ...hyper.EntityID) error
}

// New creates a new P2P Node. The users must call Start() before using the node, and can use Ready() to wait
// for when the node is ready to use.
func New(cfg config.P2P, db *sqlitex.Pool, blobs *hyper.Storage, me core.Identity, log *zap.Logger, extraServers ...interface{}) (*Node, error) {
	var clean cleanup.Stack

	host, closeHost, err := newLibp2p(cfg, me.DeviceKey().Wrapped(), db)
	if err != nil {
		return nil, fmt.Errorf("failed to start libp2p host: %w", err)
	}
	clean.Add(closeHost)

	bitswap, err := ipfs.NewBitswap(host, host.Routing, blobs.IPFSBlockstore())
	if err != nil {
		return nil, fmt.Errorf("failed to start bitswap: %w", err)
	}
	clean.Add(bitswap)

	// TODO(burdiyan): find a better reproviding strategy than naive provide-everything.
	providing, err := ipfs.NewProviderSystem(host.Datastore(), host.Routing, makeProvidingStrategy(db))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize providing: %w", err)
	}
	clean.Add(providing)

	client := NewClient(me, host)
	clean.Add(client)

	n := &Node{
		log:       log,
		blobs:     blobs,
		db:        db,
		me:        me,
		cfg:       cfg,
		client:    client,
		p2p:       host,
		bitswap:   bitswap,
		providing: providing,
		grpc:      grpc.NewServer(),
		quit:      &clean,
		ready:     make(chan struct{}),
	}

	rpc := &rpcMux{Node: n}
	p2p.RegisterP2PServer(n.grpc, rpc)

	for _, extra := range extraServers {
		if extraServer, ok := extra.(groups.WebsiteServer); ok {
			groups.RegisterWebsiteServer(n.grpc, extraServer)
			break
		}
	}

	return n, nil
}

// SetInvoicer assign an invoicer service to the node struct.
func (n *Node) SetInvoicer(inv Invoicer) {
	n.invoicer = inv
}

// ID returns the node's identity.
func (n *Node) ID() core.Identity {
	return n.me
}

// Provider returns the underlying providing system for convenience.
func (n *Node) Provider() provider.System {
	return n.providing
}

// ProvideCID notifies the providing system to provide the given CID on the DHT.
func (n *Node) ProvideCID(c cid.Cid) error {
	n.log.Debug("Providing to the DHT", zap.String("CID", c.String()))
	err := n.providing.Provide(c)
	if err != nil {
		n.log.Warn("Provided Failed", zap.String("CID", c.String()), zap.Error(err))
		return err
	}
	n.log.Debug("Provided Succeeded!", zap.String("CID", c.String()))
	return nil
}

// Bitswap returns the underlying Bitswap service.
func (n *Node) Bitswap() *ipfs.Bitswap {
	return n.bitswap
}

// Client dials a remote peer if necessary and returns the RPC client handle.
func (n *Node) Client(ctx context.Context, pid peer.ID) (p2p.P2PClient, error) {
	if err := n.Connect(ctx, n.p2p.Peerstore().PeerInfo(pid)); err != nil {
		return nil, err
	}

	return n.client.Dial(ctx, pid)
}

// SiteClient opens a connection with a remote website.
func (n *Node) SiteClient(ctx context.Context, pid peer.ID) (WebsiteClient, error) {
	if err := n.Connect(ctx, n.p2p.Peerstore().PeerInfo(pid)); err != nil {
		return nil, err
	}

	conn, err := n.client.dialPeer(ctx, pid)
	if err != nil {
		return nil, err
	}
	return groups.NewWebsiteClient(conn), nil
}

// ArePrivateIPsAllowed check if private IPs (local) are allowed to connect.
func (n *Node) ArePrivateIPsAllowed() bool {
	return !n.cfg.NoPrivateIps
}

// AccountForDevice returns the linked AccountID of a given device.
func (n *Node) AccountForDevice(ctx context.Context, pid peer.ID) (core.Principal, error) {
	var out core.Principal
	if err := n.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		pk, err := pid.ExtractPublicKey()
		if err != nil {
			return err
		}

		delegate := core.PrincipalFromPubKey(pk)

		list, err := hypersql.KeyDelegationsListByDelegate(conn, delegate)
		if err != nil {
			return err
		}
		if len(list) == 0 {
			return fmt.Errorf("not found key delegation for peer: %s", pid)
		}

		if len(list) > 1 {
			n.log.Warn("MoreThanOneKeyDelegation", zap.String("peer", pid.String()))
		}

		del := list[0]

		out = core.Principal(del.KeyDelegationsViewIssuer)

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

// Libp2p returns the underlying libp2p host.
func (n *Node) Libp2p() *ipfs.Libp2p { return n.p2p }

// Start the node. It will block while node is running. To stop gracefully
// cancel the provided context and wait for Start to return.
func (n *Node) Start(ctx context.Context) (err error) {
	n.ctx = ctx

	n.log.Debug("P2PNodeStarted")
	defer func() { n.log.Debug("P2PNodeFinished", zap.Error(err)) }()

	if err := n.startLibp2p(ctx); err != nil {
		return err
	}

	lis, err := gostream.Listen(n.p2p.Host, ProtocolID)
	if err != nil {
		return fmt.Errorf("failed to start listener: %w", err)
	}

	g, ctx := errgroup.WithContext(ctx)

	// Start Mintter protocol listener over libp2p.
	{
		g.Go(func() error {
			return n.grpc.Serve(lis)
		})

		g.Go(func() error {
			<-ctx.Done()
			n.grpc.GracefulStop()
			return nil
		})
	}

	// Indicate that node is ready to work with.
	close(n.ready)

	werr := g.Wait()

	cerr := n.quit.Close()

	// When context is canceled the whole errgroup will be tearing down.
	// We have to wait until all goroutines finish, and then call the cleanup stack.
	return multierr.Combine(werr, cerr)
}

// AddrInfo returns info for our own peer.
func (n *Node) AddrInfo() peer.AddrInfo {
	return n.p2p.AddrInfo()
}

// Ready channel is closed when the node is ready to use. It can be used
// to await for the node to be bootstrapped and ready.
func (n *Node) Ready() <-chan struct{} {
	return n.ready
}

func (n *Node) startLibp2p(ctx context.Context) error {
	var addrs []multiaddr.Multiaddr
	if n.cfg.ListenAddrs != nil {
		addrs = append(addrs, n.cfg.ListenAddrs...)
	} else {
		lis := ipfs.DefaultListenAddrs(n.cfg.Port)
		for _, l := range lis {
			addr, err := multiaddr.NewMultiaddr(l)
			if err != nil {
				return err
			}
			addrs = append(addrs, addr)
		}
	}

	if err := n.p2p.Network().Listen(addrs...); err != nil {
		return err
	}

	if !n.cfg.NoBootstrap() {
		bootInfo, err := peer.AddrInfosFromP2pAddrs(n.cfg.BootstrapPeers...)
		if err != nil {
			return fmt.Errorf("failed to parse bootstrap addresses %+v: %w", n.cfg.BootstrapPeers, err)
		}
		ticker := time.NewTicker(10 * time.Minute)
		done := make(chan bool)
		res := n.p2p.Bootstrap(ctx, bootInfo)
		if res.NumFailedConnections == 0 {
			n.log.Info("BootstrapFinished",
				zap.Int("peersTotal", len(res.Peers)),
				zap.Int("failedConnections", int(res.NumFailedConnections)),
			)
			return nil
		}
		n.log.Info("BootstrapFinished",
			zap.NamedError("dhtError", res.RoutingErr),
			zap.Int("peersTotal", len(res.Peers)),
			zap.Int("failedConnectionsTotal", int(res.NumFailedConnections)),
			zap.Any("ConnectErrs", res.ConnectErrs),
		)

		go func() {
			for {
				select {
				case <-done:
					return
				case <-ticker.C:
					res := n.p2p.Bootstrap(ctx, bootInfo)

					n.log.Info("BootstrapFinished",
						zap.NamedError("dhtError", res.RoutingErr),
						zap.Int("peersTotal", len(res.Peers)),
						zap.Int("failedConnectionsTotal", int(res.NumFailedConnections)),
						zap.Any("ConnectErrs", res.ConnectErrs),
					)

					if res.NumFailedConnections > 0 {
						for i, err := range res.ConnectErrs {
							if err == nil {
								continue
							}
							n.log.Debug("BootstrapConnectionError",
								zap.String("peer", res.Peers[i].ID.String()),
								zap.Error(err),
							)
						}
					} else {
						ticker.Stop()
						done <- true
					}
				}
			}
		}()
	}

	return nil
}

// AddrInfoToStrings returns address as string.
func AddrInfoToStrings(info peer.AddrInfo) []string {
	var addrs []string
	for _, a := range info.Addrs {
		addrs = append(addrs, a.Encapsulate(must.Do2(multiaddr.NewComponent("p2p", info.ID.String()))).String())
	}

	return addrs
}

// AddrInfoFromStrings converts a list of full multiaddrs belonging to the same peer ID into a AddrInfo structure.
func AddrInfoFromStrings(addrs ...string) (out peer.AddrInfo, err error) {
	for i, a := range addrs {
		ma, err := multiaddr.NewMultiaddr(a)
		if err != nil {
			return out, fmt.Errorf("failed to parse multiaddr %s: %w", a, err)
		}

		transport, id := peer.SplitAddr(ma)
		if id == "" {
			return peer.AddrInfo{}, peer.ErrInvalidAddr
		}

		if i == 0 {
			out.ID = id
		} else {
			if out.ID != id {
				return out, fmt.Errorf("peer IDs do not match: %s != %s", out.ID, id)
			}
		}

		if transport != nil {
			out.Addrs = append(out.Addrs, transport)
		}
	}

	return out, nil
}

func newLibp2p(cfg config.P2P, device crypto.PrivKey, pool *sqlitex.Pool) (*ipfs.Libp2p, io.Closer, error) {
	var clean cleanup.Stack

	ds := dssync.MutexWrap(datastore.NewMapDatastore())
	clean.Add(ds)

	ps, err := pstoreds.NewPeerstore(context.Background(), ds, pstoreds.DefaultOpts())
	if err != nil {
		return nil, nil, err
	}
	// Not adding peerstore to the cleanup stack because weirdly enough, libp2p host closes it,
	// even if it doesn't own it. See BasicHost#Close() inside libp2p.

	opts := []libp2p.Option{
		libp2p.UserAgent(userAgent),
		libp2p.Peerstore(ps),
		libp2p.EnableNATService(),
	}

	if cfg.AnnounceAddrs != nil {
		opts = append(opts,
			libp2p.AddrsFactory(func([]multiaddr.Multiaddr) []multiaddr.Multiaddr {
				return cfg.AnnounceAddrs
			}),
		)
	} else {
		opts = append(opts,
			libp2p.AddrsFactory(func(addrs []multiaddr.Multiaddr) []multiaddr.Multiaddr {
				announce := make([]multiaddr.Multiaddr, 0, len(addrs))
				if cfg.NoPrivateIps {
					for _, a := range addrs {
						if manet.IsPublicAddr(a) {
							announce = append(announce, a)
						}
					}
					return announce
				}
				return addrs
			}),
		)
	}
	if !cfg.ForceReachabilityPublic && !cfg.NoRelay {
		opts = append(opts, libp2p.ForceReachabilityPrivate())
	}

	if !cfg.NoRelay {
		opts = append(opts,
			libp2p.EnableHolePunching(),
			libp2p.EnableAutoRelayWithStaticRelays(DefaultRelays(),
				autorelay.WithBootDelay(time.Second*10),
				autorelay.WithNumRelays(2),
				autorelay.WithMinCandidates(2),
				autorelay.WithBackoff(cfg.RelayBackoff)),
		)
	}

	m := ipfs.NewLibp2pMetrics()

	if !cfg.NoMetrics {
		opts = append(opts, libp2p.BandwidthReporter(m))
	}

	node, err := ipfs.NewLibp2pNode(device, ds, opts...)
	if err != nil {
		return nil, nil, err
	}
	clean.Add(node)

	m.SetHost(node.Host)

	if !cfg.NoMetrics {
		prometheus.MustRegister(m)
	}

	return node, &clean, nil
}
