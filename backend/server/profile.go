package server

import (
	"context"
	"fmt"

	"mintter/backend/identity"
	"mintter/backend/store"
	"mintter/proto"

	peer "github.com/libp2p/go-libp2p-core/peer"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// InitProfile implements InitProfile rpc.
func (s *Server) InitProfile(ctx context.Context, req *proto.InitProfileRequest) (*proto.InitProfileResponse, error) {
	if s.ready.Load() {
		return nil, status.Errorf(codes.FailedPrecondition, "profile is already initialized")
	}

	profile, err := identity.FromMnemonic(req.Mnemonic, req.AezeedPassphrase, 0)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate identity: %v", err)
	}

	s.store, err = store.Create(s.repoPath, profile)
	if err != nil {
		s.log.Error("StoreInitializationFailed", zap.Error(err))
		return nil, err
	}

	s.ready.CAS(false, true)

	return &proto.InitProfileResponse{}, nil
}

// GetProfile implements Mintter rpc.
func (s *Server) GetProfile(ctx context.Context, in *proto.GetProfileRequest) (*proto.GetProfileResponse, error) {
	if !s.ready.Load() {
		return nil, status.Error(codes.FailedPrecondition, "call InitProfile first")
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
	if !s.ready.Load() {
		return nil, status.Error(codes.FailedPrecondition, "call InitProfile first")
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

	stored, err := s.store.UpdateProfile(ctx, update)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to store profile: %v", err)
	}

	return &proto.UpdateProfileResponse{
		Profile: profileToProto(stored),
	}, nil
}

func profileToProto(prof identity.Profile) *proto.Profile {
	return &proto.Profile{
		PeerId:   prof.Peer.ID.String(),
		Username: prof.About.Username,
		Email:    prof.About.Email,
		Bio:      prof.About.Bio,
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

	return prof, nil
}
