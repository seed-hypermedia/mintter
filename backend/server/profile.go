package server

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/identity"
	"mintter/proto"
	"os"
	"path/filepath"

	"github.com/imdario/mergo"
	peer "github.com/libp2p/go-libp2p-core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// InitProfile implements InitProfile rpc.
func (s *Server) InitProfile(ctx context.Context, req *proto.InitProfileRequest) (*proto.InitProfileResponse, error) {
	if err := s.initProfile(req.Mnemonic, req.AezeedPassphrase); err != nil {
		return nil, err
	}

	return &proto.InitProfileResponse{}, nil
}

func (s *Server) initProfile(words []string, pass []byte) error {
	if _, err := s.loadProfile(); err == nil {
		return status.Error(codes.FailedPrecondition, "account is already initialized")
	}

	profile, err := identity.FromMnemonic(words, pass, 0)
	if err != nil {
		return status.Errorf(codes.Internal, "failed to generate identity: %v", err)
	}

	if err := s.storeProfile(profile); err != nil {
		return status.Errorf(codes.Internal, "failed to store profile: %v", err)
	}

	return nil
}

// GetProfile implements Mintter rpc.
func (s *Server) GetProfile(ctx context.Context, in *proto.GetProfileRequest) (*proto.GetProfileResponse, error) {
	prof, err := s.loadProfile()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load profile: %v", err)
	}

	return &proto.GetProfileResponse{
		Profile: profileToProto(prof),
	}, nil
}

// UpdateProfile implements Mintter rpc.
func (s *Server) UpdateProfile(ctx context.Context, in *proto.UpdateProfileRequest) (*proto.UpdateProfileResponse, error) {
	prof, err := s.loadProfile()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load profile: %v", err)
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

	if err := mergo.Merge(&prof, update); err != nil {
		return nil, fmt.Errorf("failed to merge profiles: %v", err)
	}

	if err := s.storeProfile(prof); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to store profile: %v", err)
	}

	return &proto.UpdateProfileResponse{
		Profile: profileToProto(prof),
	}, nil
}

func (s *Server) storeProfile(prof identity.Profile) error {
	f, err := os.Create(filepath.Join(s.repoPath, "profile.json"))
	if err != nil {
		return fmt.Errorf("failed to create profile file: %w", err)
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")

	if err := enc.Encode(prof); err != nil {
		return fmt.Errorf("failed to encode json: %w", err)
	}

	s.mu.Lock()
	s.prof = prof
	s.mu.Unlock()

	return nil
}

func (s *Server) loadProfile() (identity.Profile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.prof.Account.ID != "" {
		return s.prof, nil
	}

	f, err := os.Open(filepath.Join(s.repoPath, "profile.json"))
	if err != nil {
		return identity.Profile{}, fmt.Errorf("failed to load profile: %w", err)
	}
	defer f.Close()

	var p identity.Profile
	if err := json.NewDecoder(f).Decode(&p); err != nil {
		return identity.Profile{}, fmt.Errorf("failed to decode json profile: %w", err)
	}

	s.prof = p

	return s.prof, nil
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
		pid, err := peer.IDFromString(pbprof.PeerId)
		if err != nil {
			return identity.Profile{}, err
		}
		prof.Peer.ID = pid
	}

	return prof, nil
}
