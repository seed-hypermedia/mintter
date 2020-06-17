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
	"mintter/backend/identity"
	"mintter/backend/ipfsutil"
	"mintter/backend/store"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"

	"github.com/ipfs/go-cid"
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
	g      errgroup.Group // Background goroutines will be running in this group.

	acc      identity.Account
	peer     identity.Peer
	host     host.Host
	dag      *ipfsutil.Node
	cleanup  io.Closer
	ctx      context.Context
	quit     context.CancelFunc // This channel will be closed to indicate all the goroutines to exit.
	lis      net.Listener       // Libp2p listener wrapped into net.Listener. Used by the underlying gRPC server.
	dialOpts []grpc.DialOption  // Default dial options for gRPC client. Cached to avoid allocating same options for every call.

	mu   sync.Mutex
	subs map[identity.ProfileID]*subscription
}

// NewNode creates a new node. User must call Close() to shutdown the node gracefully.
func NewNode(repoPath string, s *store.Store, log *zap.Logger, cfg config.P2P) (n *Node, err error) {
	ctx, cancel := context.WithCancel(context.Background())

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

	n = &Node{
		store: s,
		log:   log,

		acc:      prof.Account,
		peer:     prof.Peer,
		host:     h,
		dag:      ipfsnode,
		cleanup:  &clean,
		lis:      lis,
		ctx:      ctx,
		quit:     cancel,
		dialOpts: dialOpts(h),
	}

	n.watchNetwork()
	if err := n.setupPubSub(ctx); err != nil {
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

func makeConnectionWatcher(s *store.Store, log *zap.Logger) func(net network.Network, conn network.Conn) {
	return func(net network.Network, conn network.Conn) {
		pid, err := s.GetProfileForPeer(context.TODO(), conn.RemotePeer())
		if err != nil {
			// We don't log this error because it's expected to fail for the first time this is invoked after peer is connected.
			// The thing is that this is invoked right after connection is established but it can happen that we have
			// not yet marked it as Mintter connection.
			return
		}

		err = s.UpdateProfileConnectionStatus(context.TODO(), pid, store.ConnectionStatus(net.Connectedness(conn.RemotePeer())))
		if err != nil {
			log.Warn("FailedToUpdateConnectionStatus",
				zap.String("peer", conn.RemotePeer().String()),
				zap.Error(err),
			)
		}
	}
}

func (n *Node) watchNetwork() {
	connWatcher := makeConnectionWatcher(n.store, n.log)

	n.host.Network().Notify(&network.NotifyBundle{
		ConnectedF:    connWatcher,
		DisconnectedF: connWatcher,
	})
}

func (n *Node) setupPubSub(ctx context.Context) error {
	ps, err := pubsub.NewGossipSub(ctx, n.host,
		// TODO(burdiyan): Enable this after fixing tests for #messageSigning.
		// pubsub.WithMessageAuthor(prof.Account.ID.ID),
		pubsub.WithMessageSigning(false),
		pubsub.WithStrictSignatureVerification(false),
	)
	if err != nil {
		return err
	}
	n.subs = make(map[identity.ProfileID]*subscription)
	n.pubsub = ps

	// Iterate over all profiles and setup listeners.
	profiles, err := n.store.ListProfiles(ctx, 0, 0)
	if err != nil {
		return err
	}

	for _, prof := range profiles {
		if err := n.addSubscription(prof.ID); err != nil {
			n.log.Error("FailedToAddSubscriptionWhenStarting", zap.Error(err), zap.String("profile", prof.ID.String()))
		}
	}

	return nil
}

func (n *Node) startSyncing() {
	n.g.Go(func() error {
		t := time.NewTicker(10 * time.Minute)
		defer t.Stop()

		for {
			if err := n.syncAll(); err != nil {
				n.log.Error("FailedSyncingLoop", zap.Error(err))
			}

			select {
			case <-n.ctx.Done():
				return n.ctx.Err()
			case <-t.C:
				continue
			}
		}
	})
}

func (n *Node) syncAll() error {
	// Iterate over all profiles and setup listeners.
	profiles, err := n.store.ListProfiles(n.ctx, 0, 0)
	if err != nil {
		return err
	}

	for _, prof := range profiles {
		if err := n.SyncPublications(n.ctx, prof.ID); err != nil && err != context.Canceled {
			n.log.Error("FailedToSyncPublications", zap.Error(err), zap.String("profile", prof.ID.String()))
		}
	}

	return nil
}

func (n *Node) addSubscription(pid identity.ProfileID) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	handle, ok := n.subs[pid]
	if ok {
		return nil
	}

	// Create new handle
	topic, err := n.pubsub.Join(pid.String())
	if err != nil {
		return err
	}
	sub, err := topic.Subscribe()
	if err != nil {
		return err
	}

	handle = &subscription{
		T: topic,
		S: sub,
	}
	n.subs[pid] = handle

	n.g.Go(func() (err error) {
		defer func() {
			err = multierr.Append(err, handle.Close())
		}()

		for {
			msg, err := handle.S.Next(n.ctx)
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				return err
			}
			if err != nil {
				n.log.Error("ErrorGettingPubSubMessage", zap.Error(err), zap.String("subscription", pid.String()))
				continue
			}

			if err := n.handlePubSubMessage(msg); err != nil {
				n.log.Error("ErrorHandlingPubSubMessage", zap.Error(err), zap.String("subscription", pid.String()))
				continue
			}
		}
	})

	return nil
}

func (n *Node) handlePubSubMessage(msg *pubsub.Message) error {
	cid, err := cid.Cast(msg.Message.Data)
	if err != nil {
		return err
	}

	// TODO(burdiyan): we need to sign messages propertly to avoid flood.

	return n.syncPublication(n.ctx, cid)
}

type subscription struct {
	T *pubsub.Topic
	S *pubsub.Subscription
}

func (s *subscription) Close() error {
	s.S.Cancel()
	return s.T.Close()
}
