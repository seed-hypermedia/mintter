// Package mttnet provides Mintter P2P network functionality.
package mttnet

import (
	"context"
	"fmt"
	"io"
	"mintter/backend/config"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/cleanup"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"
	"mintter/backend/vcs/vcstypes"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	dssync "github.com/ipfs/go-datastore/sync"
	"github.com/prometheus/client_golang/prometheus"
	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/singleflight"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	gostream "github.com/libp2p/go-libp2p-gostream"
	"github.com/libp2p/go-libp2p-peerstore/pstoremem"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/libp2p/go-libp2p/p2p/transport/tcp"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
)

// Prototcol values.
const (
	ProtocolVersion = "0.0.1"
	ProtocolName    = "mintter"

	ProtocolID protocol.ID = "/" + ProtocolName + "/" + ProtocolVersion

	protocolSupportKey = "mintter-support" // This is what we use as a key to protect the connection in ConnManager.
)

var userAgent = "mintter/<dev>"

func DefaultRelays() []peer.AddrInfo {
	return []peer.AddrInfo{
		// Mintter test server
		{
			ID: must.Two(peer.Decode("12D3KooWGvsbBfcbnkecNoRBM7eUTiuriDqUyzu87pobZXSdUUsJ")),
			Addrs: []multiaddr.Multiaddr{
				must.Two(multiaddr.NewMultiaddr("/ip4/52.22.139.174/tcp/4002")),
				must.Two(multiaddr.NewMultiaddr("/ip4/52.22.139.174/udp/4002/quic")),
			},
		},
		// Mintter prod server
		{
			ID: must.Two(peer.Decode("12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq")),
			Addrs: []multiaddr.Multiaddr{
				must.Two(multiaddr.NewMultiaddr("/ip4/23.20.24.146/tcp/4002")),
				must.Two(multiaddr.NewMultiaddr("/ip4/23.20.24.146/udp/4002/quic")),
			},
		},
	}
}

// Node is a Mintter P2P node.
type Node struct {
	log             *zap.Logger
	vcs             *vcs.SQLite
	syncer          *vcstypes.Syncer
	repo            *vcstypes.Repo
	singleflight    singleflight.Group
	me              core.Identity
	cfg             config.P2P
	accountObjectID vcs.ObjectID
	invoicer        Invoicer

	p2p      *ipfs.Libp2p
	bitswap  *ipfs.Bitswap
	dialOpts []grpc.DialOption
	grpc     *grpc.Server
	quit     io.Closer
	ready    chan struct{}

	ctx context.Context // will be set after calling Start()

	wg       sync.WaitGroup
	rpcConns grpcConnections
}

func New(cfg config.P2P, vcs *vcs.SQLite, accountObj vcs.ObjectID, me core.Identity, log *zap.Logger) (*Node, error) {
	var clean cleanup.Stack

	host, closeHost, err := newLibp2p(cfg, me.DeviceKey().Wrapped())
	if err != nil {
		return nil, fmt.Errorf("failed to start libp2p host: %w", err)
	}
	clean.Add(closeHost)

	bitswap, err := ipfs.NewBitswap(host, host.Routing, vcs.Blockstore())
	if err != nil {
		return nil, fmt.Errorf("failed to start bitswap: %w", err)
	}
	clean.Add(bitswap)

	n := &Node{
		log:             log,
		vcs:             vcs,
		syncer:          vcstypes.NewSyncer(vcstypes.NewIndex(vcs.DB()), me),
		repo:            vcstypes.NewRepo(me, vcs),
		me:              me,
		cfg:             cfg,
		accountObjectID: accountObj,

		p2p:      host,
		bitswap:  bitswap,
		dialOpts: makeDialOpts(host.Host),
		grpc:     grpc.NewServer(),
		quit:     &clean,
		ready:    make(chan struct{}),
	}

	// Add the wait group to the cleanup stack. This way we make sure to wait
	// for any outstanding goroutines running before shutting down the node.
	clean.AddErrFunc(func() error {
		n.wg.Wait()
		return nil
	})

	// rpc handler is how we respond to remote RPCs over libp2p.
	{
		handler := &rpcHandler{
			Node: n,
		}

		p2p.RegisterP2PServer(n.grpc, handler)
	}

	return n, nil
}

// ID returns the node's identity.
func (n *Node) ID() core.Identity {
	return n.me
}

// RPCClient dials a remote peer if necessary and returns the RPC client handle.
func (n *Node) RPCClient(ctx context.Context, device cid.Cid) (p2p.P2PClient, error) {
	pid, err := peer.FromCid(device)
	if err != nil {
		return nil, err
	}

	conn, err := n.dialPeer(ctx, pid)
	if err != nil {
		return nil, err
	}

	return p2p.NewP2PClient(conn), nil
}

func (n *Node) AccountForDevice(ctx context.Context, device cid.Cid) (cid.Cid, error) {
	conn, release, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return cid.Undef, err
	}
	defer release()

	res, err := vcssql.AccountsGetForDevice(conn, device.Hash())
	if err != nil {
		return cid.Undef, err
	}

	if res.AccountsMultihash == nil {
		return cid.Undef, fmt.Errorf("failed to find account for device %s", device)
	}

	return cid.NewCidV1(uint64(core.CodecAccountKey), res.AccountsMultihash), nil
}

// Libp2p returns the underlying libp2p host.
func (n *Node) Libp2p() *ipfs.Libp2p { return n.p2p }

// Start the node. It will block while node is running.
func (n *Node) Start(ctx context.Context) (err error) {
	n.ctx = ctx

	n.log.Debug("NodeStartStated")
	defer func() { n.log.Debug("NodeStartFinished", zap.Error(err)) }()

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
			n.log.Debug("ClosedLibp2pRPC", zap.Error(n.rpcConns.Close()))
			n.grpc.GracefulStop()
			return nil
		})
	}

	// Indicate that node is ready to work with.
	close(n.ready)

	// Start the periodic sync.
	g.Go(func() error {
		const (
			warmupDuration = time.Minute
			syncInterval   = time.Minute
		)

		t := time.NewTimer(warmupDuration)

		// Sync periodically until context is canceled.
		for {
			select {
			case <-ctx.Done():
				return nil
			case <-t.C:
				log := n.log.With(zap.Int64("traceID", time.Now().Unix()))

				log.Debug("SyncLoopStarted")

				res, err := n.Sync(ctx)
				if err != nil {
					return fmt.Errorf("fatal error in the sync background loop: %w", err)
				}

				for i, err := range res.Errs {
					if err != nil {
						log.Debug("SyncLoopError",
							zap.String("device", res.Devices[i].String()),
							zap.Error(err),
						)
					}
				}

				log.Debug("SyncLoopFinished",
					zap.Int("failures", res.NumSyncFailed),
					zap.Int("successes", res.NumSyncOK),
				)

				t.Reset(syncInterval)
			}
		}
	})

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
	port := strconv.Itoa(n.cfg.Port)

	addrs := []multiaddr.Multiaddr{
		must.Two(multiaddr.NewMultiaddr("/ip4/0.0.0.0/tcp/" + port)),
		must.Two(multiaddr.NewMultiaddr("/ip6/::/tcp/" + port)),
		// TODO(burdiyan): uncomment this when quic is known to work. Find other places for `quic-support`.
		// must.Two(multiaddr.NewMultiaddr("/ip4/0.0.0.0/udp/" + port + "/quic")),
		// must.Two(multiaddr.NewMultiaddr("/ip6/::/udp/" + port + "/quic")),
	}

	if err := n.p2p.Network().Listen(addrs...); err != nil {
		return err
	}

	if !n.cfg.NoBootstrap {
		res := n.p2p.Bootstrap(ctx)
		n.log.Info("BootstrapFinished",
			zap.NamedError("dhtError", res.RoutingErr),
			zap.Int("peersTotal", len(res.Peers)),
			zap.Int("failedConnectionsTotal", int(res.NumFailedConnections)),
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
		}
	}

	return nil
}

type rpcHandler struct {
	*Node
}

type grpcConnections struct {
	mu    sync.Mutex
	conns map[peer.ID]*grpc.ClientConn
}

// Dial attempts to dial a peer by its ID. Callers must pass a ContextDialer option that would support dialing peer IDs.
// Clients MUST NOT close the connection manually.
func (c *grpcConnections) Dial(ctx context.Context, pid peer.ID, opts []grpc.DialOption) (*grpc.ClientConn, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		c.conns = make(map[peer.ID]*grpc.ClientConn)
	}

	if conn := c.conns[pid]; conn != nil {
		if conn.GetState() != connectivity.Shutdown {
			return conn, nil
		}

		// Best effort closing connection.
		go conn.Close()

		delete(c.conns, pid)
	}

	conn, err := grpc.DialContext(ctx, pid.String(), opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to establish connection to device %s: %w", peer.ToCid(pid), err)
	}

	if c.conns[pid] != nil {
		panic("BUG: adding connection while there's another open")
	}

	c.conns[pid] = conn

	return conn, nil
}

func (c *grpcConnections) Close() (err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		return nil
	}

	for _, conn := range c.conns {
		err = multierr.Append(err, conn.Close())
	}

	return err
}

func makeDialOpts(host host.Host) []grpc.DialOption {
	return []grpc.DialOption{
		grpc.WithContextDialer(func(ctx context.Context, target string) (net.Conn, error) {
			id, err := peer.Decode(target)
			if err != nil {
				return nil, fmt.Errorf("failed to dial peer %s: %w", target, err)
			}

			return gostream.Dial(ctx, host, id, ProtocolID)
		}),
		grpc.WithInsecure(),
		grpc.WithBlock(),
	}
}

func AddrInfoToStrings(info peer.AddrInfo) []string {
	var addrs []string
	for _, a := range info.Addrs {
		addrs = append(addrs, a.Encapsulate(must.Two(multiaddr.NewComponent("p2p", info.ID.String()))).String())
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

func newLibp2p(cfg config.P2P, device crypto.PrivKey) (*ipfs.Libp2p, io.Closer, error) {
	var clean cleanup.Stack
	ds := dssync.MutexWrap(datastore.NewMapDatastore())
	clean.Add(ds)

	ps, err := pstoremem.NewPeerstore()
	if err != nil {
		return nil, nil, err
	}
	clean.Add(ps)

	m := ipfs.NewLibp2pMetrics()

	opts := []libp2p.Option{
		libp2p.UserAgent(userAgent),
		libp2p.Peerstore(ps),
		libp2p.EnableNATService(),
		// TODO: get rid of this when quic is known to work well. Find other places for `quic-support`.
		libp2p.Transport(tcp.NewTCPTransport),
	}

	if !cfg.NoRelay {
		opts = append(opts,
			libp2p.NATPortMap(),
			libp2p.EnableHolePunching(),
			libp2p.EnableNATService(),
			libp2p.EnableAutoRelay(autorelay.WithStaticRelays(DefaultRelays()),
				autorelay.WithBackoff(time.Duration(cfg.RelayBackoffDelay)*time.Minute)),
		)
	}

	if !cfg.NoMetrics {
		opts = append(opts, libp2p.BandwidthReporter(m))
	}

	node, err := ipfs.NewLibp2pNode(device, ds, ipfs.DefaultBootstrapPeers(), opts...)
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
