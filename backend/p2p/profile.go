package p2p

import (
	"context"
	"fmt"

	"mintter/backend/identity"
	"mintter/backend/p2p/internal"

	"github.com/libp2p/go-libp2p-core/crypto"
	peer "github.com/libp2p/go-libp2p-core/peer"
	"go.uber.org/zap"
)

// GetProfile of a peer. It will use the local cache if the peer id is present, otherwise
// it will try to resolve the profile over the network.
func (n *Node) GetProfile(ctx context.Context, pid peer.ID) (identity.Profile, error) {
	if pid == n.peer.ID {
		return n.store.CurrentProfile(ctx)
	}

	// To avoid making additional request we first
	// check if the requested peer ID is in our local cache.
	if profID, err := n.store.GetProfileForPeer(ctx, pid); err == nil {
		if p, err := n.store.GetProfile(ctx, profID); err == nil {
			return p, nil
		}
	}

	conn, err := n.dial(ctx, pid)
	if err != nil {
		return identity.Profile{}, err
	}
	defer logClose(n.log, conn.Close, "error closing grpc connection")

	pbprof, err := internal.NewPeerServiceClient(conn).GetProfile(ctx, &internal.GetProfileRequest{})
	if err != nil {
		return identity.Profile{}, err
	}

	return profileFromProto(pbprof)
}

// SyncProfiles from a remote peer.
func (n *Node) SyncProfiles(ctx context.Context, pid identity.ProfileID) error {
	conn, err := n.dialProfile(ctx, pid)
	if err != nil {
		return err
	}
	defer logClose(n.log, conn.Close, "error closing grpc connection")

	resp, err := internal.NewPeerServiceClient(conn).ListProfiles(ctx, &internal.ListProfilesRequest{})
	if err != nil {
		return err
	}

	for _, pbprof := range resp.Profiles {
		p, err := profileFromProto(pbprof)
		if err != nil {
			n.log.Warn("FailedProfileFromProto", zap.Error(err))
			continue
		}

		// Avoid to store our own profile returned by the remote peer.
		if p.Account.ID == n.acc.ID {
			continue
		}

		if ok, _ := n.store.HasProfile(ctx, p.Account.ID); ok {
			continue
		}

		if err := n.store.StoreSuggestedProfile(ctx, p); err != nil {
			n.log.Error("FailedToStoreSuggestedProfile", zap.Error(err))
			continue
		}
	}

	return nil
}

func (n *rpcHandler) GetProfile(ctx context.Context, in *internal.GetProfileRequest) (*internal.Profile, error) {
	prof, err := n.store.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	return profileToProto(prof)
}

func (n *rpcHandler) ListProfiles(ctx context.Context, in *internal.ListProfilesRequest) (*internal.ListProfilesResponse, error) {
	if in.PageSize != 0 || in.PageToken != "" {
		n.log.Warn("UnimplementedPaginationRequested", zap.String("request", "ListProfiles"))
	}

	profiles, err := n.store.ListProfiles(ctx, 0, 0)
	if err != nil {
		return nil, err
	}

	resp := &internal.ListProfilesResponse{}

	for _, p := range profiles {
		// TODO(burdiyan): this is not pretty.
		if p.ID == n.Node.Account().ID {
			continue
		}

		pbprof, err := profileToProto(p)
		if err != nil {
			n.log.Warn("FailedProfileToProto", zap.Error(err))
			continue
		}

		resp.Profiles = append(resp.Profiles, pbprof)
	}

	return resp, nil
}

func profileToProto(p identity.Profile) (*internal.Profile, error) {
	pk, err := crypto.MarshalPublicKey(p.Account.PubKey)
	if err != nil {
		return nil, err
	}

	return &internal.Profile{
		PeerId:        p.Peer.ID.String(),
		AccountId:     p.Account.ID.String(),
		AccountPubKey: pk,
		Username:      p.About.Username,
		Email:         p.About.Email,
		Bio:           p.About.Bio,
	}, nil
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

	if pb.AccountPubKey != nil {
		pk, err := crypto.UnmarshalPublicKey(pb.AccountPubKey)
		if err != nil {
			return identity.Profile{}, err
		}

		prof.Account.PubKey.PubKey = pk
	}

	return prof, nil
}
