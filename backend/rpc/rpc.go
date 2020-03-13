package rpc

import (
	"context"
	"mintter/backend/daemon"
	"mintter/proto"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements Mintter rpc.
type Server struct {
	d *daemon.Daemon
}

// NewServer creates a new Server.
func NewServer(d *daemon.Daemon) (*Server, error) {
	return &Server{
		d: d,
	}, nil
}

// GenSeed implements GenSeed rpc.
func (s *Server) GenSeed(ctx context.Context, req *proto.GenSeedRequest) (*proto.GenSeedResponse, error) {
	mnemonic, seed, err := s.d.GenSeed(req.AezeedPassphrase)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed GenSeed: %v", err)
	}

	resp := &proto.GenSeedResponse{
		Mnemonic:       mnemonic[:],
		EncipheredSeed: seed[:],
	}

	return resp, nil
}

// InitWallet implements InitWallet rpc.
func (s *Server) InitWallet(ctx context.Context, req *proto.InitWalletRequest) (*proto.InitWalletResponse, error) {
	var m daemon.Mnemonic

	copy(m[:], req.Mnemonic)

	if err := s.d.InitWallet(m, req.AezeedPassphrase); err != nil {
		return nil, status.Errorf(codes.Internal, "failed InitWallet: %v", err)
	}

	return &proto.InitWalletResponse{}, nil
}
