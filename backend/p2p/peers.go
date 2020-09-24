package p2p

import (
	"context"
	"fmt"
	"mintter/backend/identity"
	"mintter/backend/p2p/internal"

	"github.com/libp2p/go-libp2p-core/host"
	peer "github.com/libp2p/go-libp2p-core/peer"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

	// It's fine, and we have to stop if we at least
	// have connected to one of the provided addresses.
	for _, pinfo := range pinfos {
		connErr := n.connect(ctx, pinfo)
		if connErr == nil {
			return nil
		}
		err = multierr.Append(err, connErr)
	}

	return err
}

func (n *Node) connect(ctx context.Context, pinfo peer.AddrInfo) error {
	if swarm, ok := n.host.Network().(*swarm.Swarm); ok {
		// clear backoff b/c we're explicitly dialing this peer
		swarm.Backoff().Clear(pinfo.ID)
	}

	if err := n.host.Connect(ctx, pinfo); err != nil {
		return fmt.Errorf("failed to connect %s: %w", pinfo.ID.Pretty(), err)
	}

	prof, err := n.handshake(ctx, pinfo.ID)
	if err != nil {
		return fmt.Errorf("failed invoking handshake to %s: %w", pinfo.ID.Pretty(), err)
	}
	// Best-effort attempt to delete a suggested profile just in case this peer was one of these.
	defer func() {
		if err := n.store.DeleteSuggestedProfile(ctx, prof.ID); err != nil {
			_ = err
		}
	}()

	if err := n.savePeerProfile(ctx, prof); err != nil {
		// TODO: if the err is ErrQriProtocolNotSupported, let the user know the
		// connection has been established, but that the Qri Protocol is not supported
		return fmt.Errorf("failed to save peer profile: %w", err)
	}

	if err := n.SyncProfiles(ctx, prof.ID); err != nil {
		n.log.Info("FailedSyncingProfilesAfterConnect", zap.Error(err), zap.String("profile", prof.ID.String()))
	}

	return nil
}

// Disconnect closes connection with a remote node.
func (n *Node) Disconnect(ctx context.Context, pid identity.ProfileID) error {
	prof, err := n.store.GetProfile(ctx, pid)
	if err != nil {
		return err
	}

	if err := n.host.Network().ClosePeer(prof.Peer.ID); err != nil {
		return err
	}

	return nil
}

// savePeerProfile stores another peer's profile and marks it's connection to support mintter protocol.
func (n *Node) savePeerProfile(ctx context.Context, prof identity.Profile) error {
	const (
		// Default value to give for peer connections in connmanager. Stolen from qri.
		supportValue = 100
		// Under this key we store support flag in the peer store.
		supportKey = "mtt-support"
	)

	pid := prof.Peer.ID

	// bail early if we have seen this peer before
	if v, err := n.host.Peerstore().Get(pid, supportKey); err == nil {
		support, ok := v.(bool)
		if !ok {
			return fmt.Errorf("support flag stored incorrectly in the peerstore")
		}
		if support {
			return nil
		}
	}

	support, err := supportsProtocol(n.host, pid)
	if err != nil {
		return fmt.Errorf("error checking for protocol support: %w", err)
	}

	if !support {
		return ErrUnsupportedProtocol
	}

	if err := n.store.StoreProfile(ctx, prof); err != nil {
		return fmt.Errorf("failed to store profile: %w", err)
	}

	if err := n.addSubscription(prof.ID); err != nil {
		return fmt.Errorf("failed to add subscription: %w", err)
	}

	// tag the connection as more important in the conn manager:
	n.host.ConnManager().TagPeer(pid, supportKey, supportValue)

	// mark whether or not this connection supports the protocol:
	if err := n.host.Peerstore().Put(pid, supportKey, support); err != nil {
		return err
	}

	return nil
}

func (n *Node) handshake(ctx context.Context, pid peer.ID) (identity.Profile, error) {
	conn, err := n.dial(ctx, pid)
	if err != nil {
		return identity.Profile{}, err
	}
	defer logClose(n.log, conn.Close, "failed closing grpc connection")

	me, err := n.store.CurrentProfile(ctx)
	if err != nil {
		return identity.Profile{}, err
	}

	pbprof, err := profileToProto(me)
	if err != nil {
		return identity.Profile{}, err
	}

	resp, err := internal.NewPeerServiceClient(conn).Handshake(ctx, &internal.HandshakeRequest{
		Profile: pbprof,
	})
	if err != nil {
		return identity.Profile{}, err
	}

	return profileFromProto(resp.Profile)
}

func (n *rpcHandler) Handshake(ctx context.Context, in *internal.HandshakeRequest) (*internal.HandshakeResponse, error) {
	// Check if request contains the profile.
	if in.Profile == nil {
		return nil, status.Error(codes.InvalidArgument, "profile is required")
	}

	prof, err := profileFromProto(in.Profile)
	if err != nil {
		return nil, err
	}

	if err := n.savePeerProfile(ctx, prof); err != nil {
		return nil, err
	}

	me, err := n.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	pbprof, err := profileToProto(me)
	if err != nil {
		return nil, err
	}

	return &internal.HandshakeResponse{
		Profile: pbprof,
	}, nil
}

// supportsProtocol checks to see if this peer supports the qri
// streaming protocol, returns
func supportsProtocol(h host.Host, peer peer.ID) (bool, error) {
	protos, err := h.Peerstore().GetProtocols(peer)
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
