package backend

import (
	"context"
	"fmt"

	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/zap"

	"mintter/backend/config"
	"mintter/backend/ipfsutil"
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
	*ipfsutil.IPFS

	cfg  config.P2P
	boot ipfsutil.Bootstrappers
	log  *zap.Logger
}

// newP2PNode creates a new Mintter P2P wrapper.
func newP2PNode(cfg config.P2P, log *zap.Logger, n *ipfsutil.IPFS, boot ipfsutil.Bootstrappers) *p2pNode {
	p2p := &p2pNode{
		IPFS: n,

		cfg:  cfg,
		boot: boot,
		log:  log,
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

	if err := n.Host.Network().Listen(ma); err != nil {
		return err
	}

	if !n.cfg.NoBootstrap {
		res := ipfsutil.Bootstrap(ctx, n.Host, n.Routing, n.boot)
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

	return nil
}
