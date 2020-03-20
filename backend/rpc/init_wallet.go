package rpc

import (
	"context"
	"io/ioutil"
	"mintter/backend/identity"
	"mintter/proto"
	"path/filepath"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// InitWallet implements InitWallet rpc.
func (s *Server) InitWallet(ctx context.Context, req *proto.InitWalletRequest) (*proto.InitWalletResponse, error) {
	var m Mnemonic

	copy(m[:], req.Mnemonic)

	if err := s.initWallet(m, req.AezeedPassphrase); err != nil {
		return nil, err
	}

	return &proto.InitWalletResponse{}, nil
}

func (s *Server) initWallet(m Mnemonic, pass []byte) error {
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

func (s *Server) storeSeed(seed EncipheredSeed) error {
	return ioutil.WriteFile(filepath.Join(s.repoPath, "seed"), seed[:], 0400)
}

func (s *Server) loadSeed() (EncipheredSeed, error) {
	var seed EncipheredSeed

	data, err := ioutil.ReadFile(filepath.Join(s.repoPath, "seed"))
	if err != nil {
		return seed, err
	}

	copy(seed[:], data)

	return seed, nil
}
