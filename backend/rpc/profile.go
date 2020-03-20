package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/identity"
	"mintter/proto"
	"os"
	"path/filepath"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// GetProfile implements Mintter rpc.
func (s *Server) GetProfile(ctx context.Context, in *proto.GetProfileRequest) (*proto.GetProfileResponse, error) {
	prof, err := s.loadProfile()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load profile: %v", err)
	}

	return &proto.GetProfileResponse{
		Profile: &proto.Profile{
			PeerId: prof.PeerID.String(),
		},
	}, nil
}

// UpdateProfile implements Mintter rpc.
func (s *Server) UpdateProfile(ctx context.Context, in *proto.UpdateProfileRequest) (*proto.UpdateProfileResponse, error) {
	return nil, status.Error(codes.Unimplemented, "not implemented")
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
	if s.prof.PeerID != "" {
		return s.prof, nil
	}

	f, err := os.Open(filepath.Join(s.repoPath, "profile.json"))
	if err != nil {
		return identity.Profile{}, fmt.Errorf("failed to load profile: %w", err)
	}

	var p identity.Profile
	if err := json.NewDecoder(f).Decode(&p); err != nil {
		return identity.Profile{}, fmt.Errorf("failed to decode json profile: %w", err)
	}

	s.prof = p

	return s.prof, nil
}
