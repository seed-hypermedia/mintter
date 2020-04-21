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
	if pid == n.peer.ID {
		return n.store.CurrentProfile(ctx)
	}

	// TODO(burdiyan): Check local cache before dialing.

	conn, err := n.dial(ctx, pid)
	if err != nil {
		return identity.Profile{}, err
	}
	defer logClose(n.log, conn.Close, "error closing grpc connection")

	me, err := n.store.CurrentProfile(ctx)
	if err != nil {
		return me, err
	}

	pbprof, err := internal.NewPeerServiceClient(conn).GetProfile(ctx, &internal.GetProfileRequest{
		Profile: profileToProto(me),
	})
	if err != nil {
		return identity.Profile{}, err
	}

	return profileFromProto(pbprof)
}

func (n *rpcHandler) GetProfile(ctx context.Context, in *internal.GetProfileRequest) (*internal.Profile, error) {
	prof, err := n.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	if in.Profile != nil {
		prof, err := profileFromProto(in.Profile)
		if err != nil {
			return nil, err
		}

		// TODO(burdiyan): this will call get profile rpc again but there's no need.
		if err := n.Node.upgradeConnection(ctx, prof.Peer.ID); err != nil {
			return nil, err
		}
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
		prof.Account.ID = identity.ProfileID{ID: pid}
		prof.ID = identity.ProfileID{ID: pid}
	}

	return prof, nil
}
