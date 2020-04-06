package server

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

// InitProfile implements InitProfile rpc.
func (s *Server) InitProfile(ctx context.Context, req *proto.InitProfileRequest) (*proto.InitProfileResponse, error) {
	var m Mnemonic

	copy(m[:], req.Mnemonic)

	if err := s.initProfile(m, req.AezeedPassphrase); err != nil {
		return nil, err
	}

	return &proto.InitProfileResponse{}, nil
}

func (s *Server) initProfile(m Mnemonic, pass []byte) error {
	seed, err := m.ToCipherSeed(pass)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "failed to decipher seed: %v", err)
	}

	if _, err := s.loadProfile(); err == nil {
		return status.Error(codes.FailedPrecondition, "wallet is already initialized")
	}

	profile, err := identity.FromSeed(seed.Entropy[:], 0)
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
		Profile: &proto.Profile{
			PeerId:          prof.PeerID.String(),
			Username:        prof.Username,
			Email:           prof.Email,
			TwitterUsername: prof.TwitterUsername,
			Bio:             prof.Bio,
		},
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

	if in.Profile.Email != "" {
		prof.Email = in.Profile.Email
	}

	if in.Profile.Username != "" {
		prof.Username = in.Profile.Username
	}

	if in.Profile.TwitterUsername != "" {
		prof.TwitterUsername = in.Profile.TwitterUsername
	}

	if in.Profile.Bio != "" {
		prof.Bio = in.Profile.Bio
	}

	if err := s.storeProfile(prof); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to store profile: %v", err)
	}

	return &proto.UpdateProfileResponse{
		Profile: &proto.Profile{
			PeerId:          prof.PeerID.String(),
			Username:        prof.Username,
			TwitterUsername: prof.TwitterUsername,
			Email:           prof.Email,
			Bio:             prof.Bio,
		},
	}, nil
}

func (s *Server) storeProfile(prof identity.Profile) error {
	fmt.Printf("%T\n", prof.PubKey)

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
