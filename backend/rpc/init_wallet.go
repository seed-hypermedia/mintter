package rpc

import (
	"context"
	"errors"
	"fmt"
	"io/ioutil"
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
		return nil, status.Errorf(codes.Internal, "failed InitWallet: %v", err)
	}

	return &proto.InitWalletResponse{}, nil
}

func (s *Server) initWallet(m Mnemonic, pass []byte) error {
	seed, err := m.ToCipherSeed(pass)
	if err != nil {
		return fmt.Errorf("failed to decipher seed: %w", err)
	}

	rawSeed, err := seed.Encipher(pass)
	if err != nil {
		return fmt.Errorf("failed to encipher seed: %w", err)
	}

	if _, err := s.loadSeed(); err == nil {
		return errors.New("wallet is already initialized")
	}

	if err := s.storeSeed(rawSeed); err != nil {
		return fmt.Errorf("failed to store seed: %w", err)
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
