// Package p2p provides networking capabilities for Mintter protocol over libp2p.
package p2p

import (
	"context"
	"io"
	"net"
	"path/filepath"
	"time"

	"mintter/backend"
	"mintter/backend/cleanup"
	"mintter/backend/config"
	"mintter/backend/identity"
	"mintter/backend/ipfsutil"
	"mintter/backend/store"

	"github.com/ipfs/go-datastore"
	format "github.com/ipfs/go-ipld-format"
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

	badger "github.com/ipfs/go-ds-badger"
	ipld "github.com/ipfs/go-ipld-format"       // OMG someone should kill the people naming IPFS Go packages.
	relay "github.com/libp2p/go-libp2p-circuit" // OMG someone should kill the people naming IPFS Go packages.
	connmgr "github.com/libp2p/go-libp2p-connmgr"
	gostream "github.com/libp2p/go-libp2p-gostream"
)

// Prototcol values.
const (
	ProtocolVersion = "0.0.1"
	ProtocolName    = "mintter"

	ProtocolID protocol.ID = "/" + ProtocolName + "/" + ProtocolVersion
)

const (
	// Default value to give for peer connections in connmanager. Stolen from qri.
	supportValue = 100
	// Under this key we store support flag in the peer store.
	supportKey = "mtt-support"
	profileKey = "mtt-profile"
)

// userAgent is type & version of the mtt service.
var userAgent = "mintter/" + backend.Version

// Errors.
const (
	ErrNotConnected        = Error("no p2p connection")
	ErrUnsupportedProtocol = Error("peer doesn't support the Mintter protocol")
)

// Error is a constant type for errors.
type Error string

func (e Error) Error() string {
	return string(e)
}

// Node is a Mintter p2p node.
type Node struct {
	store *store.Store
	log   *zap.Logger

	g errgroup.Group // Background goroutines will be running in this group.

	acc      identity.Account
	peer     identity.Peer
	host     host.Host
	dag      ipld.DAGService
	cleanup  io.Closer
	addrs    []multiaddr.Multiaddr // Libp2p peer addresses for this node.
	quitc    chan struct{}         // This channel will be closed to indicate all the goroutines to exit.
	lis      net.Listener          // Libp2p listener wrapped into net.Listener. Used by the underlying gRPC server.
	dialOpts []grpc.DialOption     // Default dial options for gRPC client. Cached to avoid allocating same options for every call.
}

// NewNode creates a new node. User must call Close() to shutdown the node gracefully.
func NewNode(ctx context.Context, repoPath string, s *store.Store, log *zap.Logger, cfg config.P2P) (n *Node, err error) {
	var cleanup cleanup.Stack
	defer func() {
		if err != nil {
			err = multierr.Append(err, cleanup.Close())
		}
	}()

	db, err := badger.NewDatastore(filepath.Join(repoPath, "ipfslite"), &badger.DefaultOptions)
	if err != nil {
		return nil, err
	}
	cleanup = append(cleanup, db)

	prof, err := s.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	h, dht, err := makeHost(ctx, prof.Peer, db, libp2p.ListenAddrStrings(cfg.Addr))
	if err != nil {
		return nil, err
	}
	cleanup = append(cleanup, h, dht)

	ipfsnode, err := ipfsutil.New(ctx, db, h, dht, nil)
	if err != nil {
		return nil, err
	}
	cleanup = append(cleanup, ipfsnode)

	// TODO(burdiyan): Bootstrap IPFS node.

	addrs, err := wrapAddrs(prof.Peer.ID, h.Addrs()...)
	if err != nil {
		return nil, err
	}

	lis, err := gostream.Listen(h, ProtocolID)
	if err != nil {
		return nil, err
	}
	cleanup = append(cleanup, lis)

	n = &Node{
		store: s,
		log:   log,

		acc:      prof.Account,
		peer:     prof.Peer,
		host:     h,
		dag:      ipfsnode,
		addrs:    addrs,
		cleanup:  cleanup,
		lis:      lis,
		quitc:    make(chan struct{}),
		dialOpts: dialOpts(h),
	}

	n.serveRPC()

	return n, nil
}

// Close the node gracefully.
func (n *Node) Close() (err error) {
	// Signal goroutines to return.
	close(n.quitc)

	return multierr.Combine(err, n.g.Wait(), n.cleanup.Close())
}

// Host of the p2p node.
func (n *Node) Host() host.Host {
	return n.host
}

// Store of the node.
func (n *Node) Store() *store.Store {
	return n.store
}

// Account of the node.
func (n *Node) Account() identity.Account {
	return n.acc
}

// Addrs return p2p multiaddresses this node is listening on.
func (n *Node) Addrs() []multiaddr.Multiaddr {
	return n.addrs
}

func (n *Node) unwrapIPLD(ipld format.Node, v interface{}) {

}

// makeHost creates a new libp2p host.
func makeHost(ctx context.Context, p identity.Peer, db datastore.Batching, opts ...libp2p.Option) (host.Host, *dual.DHT, error) {
	// TODO(burdiyan): pass the ps and don't forget to close.
	ps, err := pstoreds.NewPeerstore(ctx, db, pstoreds.DefaultOpts())
	if err != nil {
		return nil, nil, err
	}

	// This is borrowed from Qri's makeBasicHost. Not sure if it's needed.
	{
		if err := ps.AddPrivKey(p.ID, p.PrivKey); err != nil {
			return nil, nil, err
		}

		if err := ps.AddPubKey(p.ID, p.PubKey); err != nil {
			return nil, nil, err
		}
	}

	o := []libp2p.Option{
		libp2p.UserAgent(userAgent),
		libp2p.Peerstore(ps),
		// Borrowed from qri. Is this really needed for non-public nodes?
		libp2p.EnableRelay(relay.OptHop),
		// Borrowed from go-threads.
		libp2p.ConnectionManager(connmgr.NewConnManager(100, 400, time.Minute)),
		// Check out extra options in ipfsutil.
	}

	o = append(o, opts...)

	return ipfsutil.SetupLibp2p(ctx, p.PrivKey, nil, db, o...)
}

func wrapAddrs(pid peer.ID, addrs ...multiaddr.Multiaddr) ([]multiaddr.Multiaddr, error) {
	host, err := multiaddr.NewComponent("p2p", pid.String())
	if err != nil {
		return nil, err
	}

	res := make([]multiaddr.Multiaddr, len(addrs))
	for i, a := range addrs {
		res[i] = a.Encapsulate(host)
	}

	return res, nil
}
