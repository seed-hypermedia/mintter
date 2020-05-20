package server

import (
	"context"
	"fmt"

	"mintter/backend/identity"
	"mintter/proto"

	peer "github.com/libp2p/go-libp2p-core/peer"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// InitProfile implements InitProfile rpc.
func (s *Server) InitProfile(ctx context.Context, req *proto.InitProfileRequest) (*proto.InitProfileResponse, error) {
	if err := s.checkReady(); err == nil {
		return nil, status.Errorf(codes.FailedPrecondition, "profile is already initialized")
	}

	profile, err := identity.FromMnemonic(req.Mnemonic, req.AezeedPassphrase, 0)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate identity: %v", err)
	}

	if err := s.init(profile); err != nil {
		s.log.Error("NodeInitFailed", zap.Error(err))
		return nil, err
	}

	return &proto.InitProfileResponse{}, nil
}

// GetProfile implements Mintter rpc.
func (s *Server) GetProfile(ctx context.Context, in *proto.GetProfileRequest) (*proto.GetProfileResponse, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	prof, err := s.store.CurrentProfile(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load profile: %v", err)
	}

	return &proto.GetProfileResponse{
		Profile: profileToProto(prof),
	}, nil
}

// UpdateProfile implements Mintter rpc.
func (s *Server) UpdateProfile(ctx context.Context, in *proto.UpdateProfileRequest) (*proto.UpdateProfileResponse, error) {
	if err := s.checkReady(); err != nil {
		return nil, err
	}

	if in.Profile == nil {
		return nil, status.Error(codes.InvalidArgument, "parameter 'profile' is required")
	}

	// Clear output only fields.
	in.Profile.PeerId = ""

	update, err := profileFromProto(in.Profile)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to convert proto profile into profile: %v", err)
	}

	stored, err := s.store.UpdateProfile(ctx, update.About)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to store profile: %v", err)
	}

	return &proto.UpdateProfileResponse{
		Profile: profileToProto(stored),
	}, nil
}

// GetProfileAddrs implements Mintter server.
func (s *Server) GetProfileAddrs(ctx context.Context, in *proto.GetProfileAddrsRequest) (*proto.GetProfileAddrsResponse, error) {
	mas := s.node.Addrs()
	resp := &proto.GetProfileAddrsResponse{
		Addrs: make([]string, len(mas)),
	}

	for i, ma := range mas {
		resp.Addrs[i] = ma.String()
	}

	return resp, nil
}

func profileToProto(prof identity.Profile) *proto.Profile {
	return &proto.Profile{
		PeerId:    prof.Peer.ID.String(),
		AccountId: prof.Account.ID.String(),
		Username:  prof.About.Username,
		Email:     prof.About.Email,
		Bio:       prof.About.Bio,
	}
}

func profileFromProto(pbprof *proto.Profile) (identity.Profile, error) {
	prof := identity.Profile{
		About: identity.About{
			Username: pbprof.Username,
			Email:    pbprof.Email,
			Bio:      pbprof.Bio,
		},
	}

	if pbprof.PeerId != "" {
		pid, err := peer.Decode(pbprof.PeerId)
		if err != nil {
			return identity.Profile{}, fmt.Errorf("failed to decode peer id: %w", err)
		}
		prof.Peer.ID = pid
	}

	if pbprof.AccountId != "" {
		pid, err := peer.Decode(pbprof.AccountId)
		if err != nil {
			return identity.Profile{}, fmt.Errorf("failed to decode account id: %w", err)
		}
		prof.Account.ID.ID = pid
	}

	return prof, nil
}
