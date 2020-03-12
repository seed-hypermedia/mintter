package rpc

import (
	"context"
	"mintter/proto"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements Mintter rpc.
type Server struct{}

// NewServer creates a new Server.
func (s *Server) NewServer() (proto.AccountsServer, error) {
	return nil, nil
}

// GenSeed implements GenSeed rpc.
func (s *Server) GenSeed(ctx context.Context, req *proto.GenSeedRequest) (*proto.GenSeedResponse, error) {
	if len(req.AezeedPassphrase) == 0 {
		return nil, status.Error(codes.InvalidArgument, "passphrase is required")
	}

	seed, err := newSeed()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "unable to generate seed: %v", err)
	}

	words, err := seed.ToMnemonic(req.AezeedPassphrase)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "unable to generate mnemonic: %v", err)
	}

	rawSeed, err := seed.Encipher(req.AezeedPassphrase)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "unable to encipher seed: %v", err)
	}

	resp := &proto.GenSeedResponse{
		Mnemonic:       words[:],
		EncipheredSeed: rawSeed[:],
	}

	return resp, nil
}
