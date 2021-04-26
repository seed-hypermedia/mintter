package backend

import (
	"context"
	"fmt"
	"io"
	"mintter/backend/cleanup"
	"mintter/backend/config"
	"mintter/backend/ipfsutil"
	"time"

	"github.com/ipfs/go-datastore"
	"github.com/libp2p/go-libp2p"
	connmgr "github.com/libp2p/go-libp2p-connmgr"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	gostream "github.com/libp2p/go-libp2p-gostream"
	"github.com/libp2p/go-libp2p-peerstore/pstoreds"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
)

// Prototcol values.
const (
	ProtocolVersion = "0.0.1"
	ProtocolName    = "mintter"

	ProtocolID protocol.ID = "/" + ProtocolName + "/" + ProtocolVersion
)

var userAgent = "mintter/" + Version

type p2pNode struct {
	host    host.Host
	ps      *pubsub.PubSub
	cleanup io.Closer
}

func newP2PNode(cfg config.P2P, ds datastore.Batching, key crypto.PrivKey) (n *p2pNode, err error) {
	var (
		clean  cleanup.Stack
		cancel context.CancelFunc
		ctx    context.Context
		g      *errgroup.Group
	)
	defer func() {
		// We have to close all the dependencies that were initialized until the error happened.
		// This is for convenience, because otherwise we'd have to accept each dependency in the constructor
		// and it would be cumbersome to use.
		// In the happy path scenario the caller would have to call Close on the returned Node struct.
		if err != nil {
			err = multierr.Append(err, clean.Close())
		}
	}()
	ctx, cancel = context.WithCancel(context.Background())
	g, ctx = errgroup.WithContext(ctx)
	// The last item in the cleanup stack must be this,
	// so that when the user calls Close() on the p2p node
	// we wait until all the goroutines finish their execution
	// before closing all the other stuff that these goroutines might be using.
	// Errgroup goroutines must use the context as a signal to stop.
	defer clean.AddErrFunc(func() error {
		cancel()
		return g.Wait()
	})

	pstore, err := pstoreds.NewPeerstore(ctx, ds, pstoreds.DefaultOpts())
	if err != nil {
		return nil, fmt.Errorf("failed to create peerstore: %w", err)
	}
	clean.Add(pstore)

	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(cfg.Addr),
		libp2p.ConnectionManager(connmgr.NewConnManager(100, 400, time.Minute)),
		ipfsutil.TransportOpts,
		libp2p.Peerstore(pstore),
		libp2p.UserAgent(userAgent),
		// TODO(burdiyan): allow to enable this for nodes with public IPs.
		// libp2p.EnableRelay(relay.OptHop),
	}

	if !cfg.NoRelay {
		opts = append(opts, ipfsutil.RelayOpts)
	}

	if !cfg.NoTLS {
		opts = append(opts, ipfsutil.SecurityOpts)
	}

	h, dht, err := ipfsutil.SetupLibp2p(ctx, key, nil, ds, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to setup libp2p: %w", err)
	}
	clean.Add(h)
	clean.Add(dht)

	ps, err := pubsub.NewGossipSub(ctx, h,
		pubsub.WithMessageSigning(false),
		pubsub.WithStrictSignatureVerification(false),
		// TODO: add WithReadiness, and WithDiscovery.
		// TODO: enable WithPeerExchange for public nodes.
	)
	if err != nil {
		return nil, fmt.Errorf("failed to setup pubsub: %w", err)
	}

	lis, err := gostream.Listen(h, ProtocolID)
	if err != nil {
		return nil, fmt.Errorf("failed to setup gostream listener: %w", err)
	}
	clean.Add(lis)

	srv := grpc.NewServer()
	g.Go(func() error {
		<-ctx.Done()
		srv.GracefulStop()
		return ctx.Err()
	})

	// TODO: register mintter p2p api here.

	g.Go(func() error {
		return srv.Serve(lis)
	})

	node := &p2pNode{
		host:    h,
		cleanup: &clean,
		ps:      ps,
	}

	// ipfsnode, err := ipfsutil.New(ctx, ds, h, dht, nil)
	// if err != nil {
	// 	return nil, err
	// }
	// clean.Add(ipfsnode)

	return node, nil
}

func (n *p2pNode) Close() error {
	err := n.cleanup.Close()
	if err != context.Canceled && err != context.DeadlineExceeded {
		return err
	}
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

func (n *p2pNode) Addrs() ([]multiaddr.Multiaddr, error) {
	return peer.AddrInfoToP2pAddrs(host.InfoFromHost(n.host))
}
