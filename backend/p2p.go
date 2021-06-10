package backend

import (
	"context"
	"fmt"

	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/zap"

	"mintter/backend/config"
	"mintter/backend/ipfsutil"
	"mintter/backend/ipfsutil/providing"
)

// Prototcol values.
const (
	ProtocolVersion = "0.0.1"
	ProtocolName    = "mintter"

	ProtocolID protocol.ID = "/" + ProtocolName + "/" + ProtocolVersion
)

var userAgent = "mintter/" + Version

// p2pNode wraps IPFS node that would be only initialized after account is registered within the node,
// so all the components must only be accessed after making sure node is ready.
type p2pNode struct {
	cfg    config.P2P
	boot   ipfsutil.Bootstrappers
	log    *zap.Logger
	libp2p *ipfsutil.Libp2p
	prov   *providing.Provider

	ready chan struct{}
}

// newP2PNode creates a new Mintter P2P wrapper.
func newP2PNode(cfg config.P2P, log *zap.Logger, libp2p *ipfsutil.Libp2p, prov *providing.Provider, boot ipfsutil.Bootstrappers) *p2pNode {
	p2p := &p2pNode{
		cfg:    cfg,
		boot:   boot,
		log:    log,
		libp2p: libp2p,
		prov:   prov,

		ready: make(chan struct{}),
	}

	return p2p
}

// Start will start listening on the configured addressess, and will bootstrap the network if needed.
// It will block and return when bootstrapping is finished.
func (n *p2pNode) Start(ctx context.Context) error {
	ma, err := multiaddr.NewMultiaddr(n.cfg.Addr)
	if err != nil {
		return fmt.Errorf("failed to parse listen addr: %w", err)
	}

	if err := n.libp2p.Network().Listen(ma); err != nil {
		return err
	}

	if !n.cfg.NoBootstrap {
		res := ipfsutil.Bootstrap(ctx, n.libp2p, n.libp2p.Routing, n.boot)
		n.log.Info("BootstrapEnded",
			zap.NamedError("dhtError", res.RoutingErr),
			zap.Int("peersTotal", len(n.boot)),
			zap.Int("failedConnectionsTotal", int(res.NumFailedConnections)),
		)

		if res.NumFailedConnections > 0 {
			for i, err := range res.ConnectErrs {
				if err == nil {
					continue
				}
				n.log.Debug("BootstrapConnectionError",
					zap.String("peerID", n.boot[i].ID.String()),
					zap.Error(err),
				)
			}
		}
	}

	close(n.ready)

	return nil
}

// Ready can be used to wait until the node is ready.
func (n *p2pNode) Ready() <-chan struct{} {
	return n.ready
}
