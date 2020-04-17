package p2p

import (
	"context"
	"fmt"

	peer "github.com/libp2p/go-libp2p-core/peer"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"github.com/multiformats/go-multiaddr"
)

// Connect to a peer using one of the provided addresses.
// It will return as soon as the first successful connection occurs.
//
// TODO(burdiyan): should this be connecting to multiple peers at the same time?
func (n *Node) Connect(ctx context.Context, addrs ...multiaddr.Multiaddr) error {
	pinfos, err := peer.AddrInfosFromP2pAddrs(addrs...)
	if err != nil {
		return fmt.Errorf("failed to extract peer info: %w", err)
	}

	var connected bool
	for _, pinfo := range pinfos {
		if connected {
			break
		}

		if swarm, ok := n.host.Network().(*swarm.Swarm); ok {
			// clear backoff b/c we're explicitly dialing this peer
			swarm.Backoff().Clear(pinfo.ID)
		}

		if err := n.host.Connect(ctx, pinfo); err != nil {
			return fmt.Errorf("failed to connect %s: %w", pinfo.ID.Pretty(), err)
		}

		if err := n.upgradeConnection(ctx, pinfo.ID); err != nil {
			// TODO: if the err is ErrQriProtocolNotSupported, let the user know the
			// connection has been established, but that the Qri Protocol is not supported
			return err
		}

		connected = true
	}

	return nil
}

// upgradeConnection attempt to open a Mintter protocol connection to a peer.
func (n *Node) upgradeConnection(ctx context.Context, pid peer.ID) error {
	// bail early if we have seen this peer before
	// OKAY
	// log.Debugf("%s, attempting to upgrading %s to qri connection", n.ID, pid)
	if v, err := n.host.Peerstore().Get(pid, supportKey); err == nil {
		support, ok := v.(bool)
		if !ok {
			return fmt.Errorf("support flag stored incorrectly in the peerstore")
		}
		if support {
			return nil
		}
	}

	// check if this connection supports the qri protocol
	support, err := n.supportsProtocol(pid)
	if err != nil {
		// log.Debugf("error checking for qri support: %s", err)
		return err
	}
	// mark whether or not this connection supports the qri protocol:
	if err := n.host.Peerstore().Put(pid, supportKey, support); err != nil {
		// log.Debugf("error setting qri support flag: %s", err)
		return err
	}
	// if it does support the qri protocol
	// - tag the connection as a qri connection in the ConnManager
	// - request profile
	// - request profiles
	if !support {
		// log.Debugf("%s could not upgrade %s to Qri connection: %s", n.ID, pid, ErrQriProtocolNotSupported)
		return ErrUnsupportedProtocol
	}
	// log.Debugf("%s upgraded %s to Qri connection", n.ID, pid)
	// tag the connection as more important in the conn manager:
	n.host.ConnManager().TagPeer(pid, supportKey, supportValue)

	// if _, err := n.RequestProfile(ctx, pid); err != nil {
	// 	// log.Debug(err.Error())
	// 	return err
	// }

	// go func() {
	// 	ps, err := n.RequestQriPeers(ctx, pid)
	// 	if err != nil {
	// 		// log.Debug("error fetching qri peers: %s", err)
	// 	}
	// 	n.RequestNewPeers(ctx, ps)
	// }()

	return nil
}

// supportsProtocol checks to see if this peer supports the qri
// streaming protocol, returns
func (n *Node) supportsProtocol(peer peer.ID) (bool, error) {
	protos, err := n.host.Peerstore().GetProtocols(peer)
	if err != nil {
		return false, err
	}

	for _, p := range protos {
		// TODO(burdiyan): check protocol versioning here to allow compatibility.
		if p == string(ProtocolID) {
			return true, nil
		}
	}
	return false, nil
}
