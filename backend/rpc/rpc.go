package rpc

import (
	"context"
	"mintter/proto"
)

// Server implements Mintter rpc.
type Server struct{}

// NewServer creates a new Server.
func (s *Server) NewServer() (proto.AccountsServer, error) {
	return nil, nil
}

// GenSeed implements GenSeed rpc.
func (s *Server) GenSeed(ctx context.Context, req *proto.GenSeedRequest) (*proto.GenSeedResponse, error) {
	resp := &proto.GenSeedResponse{
		Mnemonic: []string{"hello", "world"},
	}

	return resp, nil
}
