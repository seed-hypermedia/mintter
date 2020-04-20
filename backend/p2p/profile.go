package p2p

import (
	"context"
	"fmt"

	"mintter/backend/identity"
	"mintter/backend/p2p/internal"

	peer "github.com/libp2p/go-libp2p-core/peer"
)

// GetProfile of a peer. It will use the local cache if the peer id is present, otherwise
// it will try to resolve the profile over the network.
func (n *Node) GetProfile(ctx context.Context, pid peer.ID) (identity.Profile, error) {
	// TODO(burdiyan): check local cache.

	// TODO(burdiyan): Peer ID vs Account ID here?
	if pid == n.peer.ID || pid == n.acc.ID {
		return n.store.GetProfile(ctx)
	}

	conn, err := n.dial(ctx, pid)
	if err != nil {
		return identity.Profile{}, err
	}
	defer logClose(n.log, conn.Close, "error closing grpc connection")

	internal.NewPeerServiceClient(conn).GetProfile(ctx, &internal.GetProfileRequest{})

	return identity.Profile{}, nil
}

func (n *rpcHandler) GetProfile(ctx context.Context, in *internal.GetProfileRequest) (*internal.Profile, error) {
	prof, err := n.store.GetProfile(ctx)
	if err != nil {
		return nil, err
	}

	return profileToProto(prof), nil
}

func profileToProto(p identity.Profile) *internal.Profile {
	return &internal.Profile{
		PeerId:    p.Peer.ID.String(),
		AccountId: p.Account.ID.String(),
		Username:  p.About.Username,
		Email:     p.About.Email,
		Bio:       p.About.Bio,
	}
}

func profileFromProto(pb *internal.Profile) (identity.Profile, error) {
	prof := identity.Profile{
		About: identity.About{
			Username: pb.Username,
			Email:    pb.Email,
			Bio:      pb.Bio,
		},
	}

	if pb.PeerId != "" {
		pid, err := peer.Decode(pb.PeerId)
		if err != nil {
			return identity.Profile{}, fmt.Errorf("failed to decode peer id: %w", err)
		}
		prof.Peer.ID = pid
	}

	if pb.AccountId != "" {
		pid, err := peer.Decode(pb.AccountId)
		if err != nil {
			return identity.Profile{}, fmt.Errorf("failed to decode peer id: %w", err)
		}
		prof.Account.ID = pid
	}

	return prof, nil
}
