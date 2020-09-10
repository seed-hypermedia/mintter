// Package p2p provides networking capabilities for Mintter protocol over libp2p.
package p2p

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"path/filepath"
	"sync"
	"time"

	"mintter/backend"
	"mintter/backend/cleanup"
	"mintter/backend/config"
	"mintter/backend/document"
	"mintter/backend/identity"
	"mintter/backend/ipfsutil"
	"mintter/backend/store"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"

	badger "github.com/ipfs/go-ds-badger"
	ipfsconfig "github.com/ipfs/go-ipfs-config"
	connmgr "github.com/libp2p/go-libp2p-connmgr"
	gostream "github.com/libp2p/go-libp2p-gostream"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
)

// Prototcol values.
const (
	ProtocolVersion = "0.0.1"
	ProtocolName    = "mintter"

	ProtocolID protocol.ID = "/" + ProtocolName + "/" + ProtocolVersion
)

const defaultSyncPeriod = 10 * time.Minute

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
	store  *store.Store
	log    *zap.Logger
	pubsub *pubsub.PubSub
	g      *errgroup.Group // Background goroutines will be running in this group.

	acc      identity.Account
	peer     identity.Peer
	host     host.Host
	ipfs     *ipfsutil.Node
	cleanup  io.Closer
	ctx      context.Context
	quit     context.CancelFunc // This channel will be closed to indicate all the goroutines to exit.
	lis      net.Listener       // Libp2p listener wrapped into net.Listener. Used by the underlying gRPC server.
	dialOpts []grpc.DialOption  // Default dial options for gRPC client. Cached to avoid allocating same options for every call.
	docsrv   *document.Server

	mu   sync.Mutex
	subs map[identity.ProfileID]*subscription
}

// NewNode creates a new node. User must call Close() to shutdown the node gracefully.
func NewNode(repoPath string, s *store.Store, log *zap.Logger, cfg config.P2P) (n *Node, err error) {
	ctx, cancel := context.WithCancel(context.Background())
	var g *errgroup.Group

	g, ctx = errgroup.WithContext(ctx)

	var clean cleanup.Stack
	defer func() {
		// We have to close all the dependencies that were initialized until the error happened.
		// This is for convenience, because otherwise we'd have to accept each dependency in the constructor
		// and it would be cumbersome to use.
		// In the happy path scenario the caller would have to call Close on the returned Node struct.
		if err != nil {
			cancel()
			err = multierr.Append(err, clean.Close())
		}
	}()

	prof, err := s.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	peerstore := s.Peerstore()

	if err := multierr.Combine(
		// Adding our own peer's keys is borrowed from Qri codebase. Not sure if actually needed.
		peerstore.AddPubKey(prof.Peer.ID, prof.Peer.PubKey),
		peerstore.AddPrivKey(prof.Peer.ID, prof.Peer.PrivKey),

		// We also add our Profile keys in order to allow pubsub to use our profile ID for message signing.
		// These keys should not be treated as normal peer keys, since they can be used by multiple network peers.
		// ps.AddPrivKey(prof.Account.ID.ID, prof.Account.PrivKey),
		// ps.AddPubKey(prof.Account.ID.ID, prof.Account.PubKey),
		//
		// TODO(burdiyan): Commented this out for now since it makes tests to fail. #messageSigning
	); err != nil {
		return nil, fmt.Errorf("failed adding keys to peer store: %w", err)
	}

	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(cfg.Addr),
		libp2p.ConnectionManager(connmgr.NewConnManager(100, 400, time.Minute)),
		ipfsutil.TransportOpts,
		libp2p.UserAgent(userAgent),
		libp2p.Peerstore(peerstore),
		// TODO(burdiyan): allow to enable this for nodes with public IPs.
		// libp2p.EnableRelay(relay.OptHop),
	}

	if !cfg.NoRelay {
		opts = append(opts, ipfsutil.RelayOpts)
	}

	if !cfg.NoTLS {
		opts = append(opts, ipfsutil.SecurityOpts)
	}

	db, err := badger.NewDatastore(filepath.Join(repoPath, "ipfslite"), &badger.DefaultOptions)
	if err != nil {
		return nil, err
	}
	clean.Add(db)

	h, dht, err := ipfsutil.SetupLibp2p(ctx, prof.Peer.PrivKey, nil, db, opts...)
	if err != nil {
		return nil, err
	}
	clean.Add(h)
	clean.Add(dht)

	ipfsnode, err := ipfsutil.New(ctx, db, h, dht, nil)
	if err != nil {
		return nil, err
	}
	clean.Add(ipfsnode)

	lis, err := gostream.Listen(h, ProtocolID)
	if err != nil {
		return nil, err
	}
	clean.Add(lis)

	ps, err := pubsub.NewGossipSub(ctx, h,
		// TODO(burdiyan): Enable this after fixing tests for #messageSigning.
		// pubsub.WithMessageAuthor(prof.Account.ID.ID),
		pubsub.WithMessageSigning(false),
		pubsub.WithStrictSignatureVerification(false),
	)
	if err != nil {
		return nil, err
	}

	n = &Node{
		store:  s,
		log:    log,
		docsrv: document.NewServer(s, ipfsnode.BlockStore(), s.DB()),
		subs:   make(map[identity.ProfileID]*subscription),
		pubsub: ps,

		acc:      prof.Account,
		peer:     prof.Peer,
		host:     h,
		ipfs:     ipfsnode,
		cleanup:  &clean,
		lis:      lis,
		g:        g,
		ctx:      ctx,
		quit:     cancel,
		dialOpts: dialOpts(h),
	}

	if err := n.subscribeToKnownProfiles(ctx); err != nil {
		return nil, err
	}

	if !cfg.NoBootstrap {
		n.g.Go(func() error {
			peers, err := ipfsconfig.DefaultBootstrapPeers()
			if err != nil {
				return err
			}
			log.Debug("IPFSBootstrapStarted")
			err = ipfsnode.Bootstrap(ctx, peers)
			log.Debug("IPFSBootstrapEnded", zap.Error(err))
			return err
		})
	}

	n.serveRPC()
	n.startSyncing()

	return n, nil
}

// Close the node gracefully.
func (n *Node) Close() (err error) {
	n.quit()

	groupErr := n.g.Wait()
	if !errors.Is(groupErr, context.Canceled) && !errors.Is(groupErr, context.DeadlineExceeded) {
		err = multierr.Append(err, groupErr)
	}

	cleanupErr := n.cleanup.Close()
	if !errors.Is(cleanupErr, context.Canceled) && !errors.Is(cleanupErr, context.DeadlineExceeded) {
		err = multierr.Append(err, cleanupErr)
	}

	return err
}

// DocServer returns the underlying documents server.
func (n *Node) DocServer() *document.Server {
	return n.docsrv
}

// IPFS returns the underlying IPFS node.
func (n *Node) IPFS() *ipfsutil.Node {
	return n.ipfs
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
func (n *Node) Addrs() ([]multiaddr.Multiaddr, error) {
	return peer.AddrInfoToP2pAddrs(host.InfoFromHost(n.host))
}
