package backend

import (
	"context"
	"fmt"

	"github.com/libp2p/go-libp2p-core/protocol"
	"github.com/multiformats/go-multiaddr"

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
	ipfs  *ipfsutil.IPFS
	repo  *repo
	ready chan struct{}
}

// newP2PNode creates a new Mintter P2P wrapper.
func newP2PNode(n *ipfsutil.IPFS, r *repo) *p2pNode {
	p2p := &p2pNode{
		ipfs:  n,
		repo:  r,
		ready: make(chan struct{}),
	}

	return p2p
}

// Start will start the services when the underlying repo is ready. It will start
// listening on the given addresses. The call is blocking and will return error
// when ctx is canceled before repo is ready.
func (n *p2pNode) Start(ctx context.Context, addrs ...multiaddr.Multiaddr) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-n.repo.Ready():
		// Start initialization only after repo is ready.
	}

	if err := n.ipfs.Host.Network().Listen(addrs...); err != nil {
		return err
	}

	close(n.ready)

	return nil
}

// IPFS returns the undelying ipfs instance or fails if it's not ready yet.
func (n *p2pNode) IPFS() (*ipfsutil.IPFS, error) {
	select {
	case <-n.Ready():
		return n.ipfs, nil
	default:
		return nil, fmt.Errorf("p2p node is not ready yet")
	}
}

// Ready can be used to check when the node is ready to use.
func (n *p2pNode) Ready() <-chan struct{} {
	return n.ready
}
